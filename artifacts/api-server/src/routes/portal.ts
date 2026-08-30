import { Router, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  CreateServiceCallBody,
  CreateServiceCallResponse,
  CreateReceiptBody,
  CreateReceiptResponse,
  DeleteServiceCallParams,
  ExtractCallIntakeBody,
  ExtractCallIntakeResponse,
  GetPublicTrackingConversationParams,
  GetPublicTrackingConversationResponse,
  GetPublicReceiptParams,
  GetPublicReceiptResponse,
  GetAvailableServiceCallPreviewParams,
  GetAvailableServiceCallPreviewResponse,
  GetServiceCallConversationParams,
  GetServiceCallConversationResponse,
  GetTechnicianNotificationsResponse,
  ListAvailableServiceCallsResponse,
  ListCallNotificationDeliveriesResponse,
  ListReceiptsResponse,
  ListReceiptSignaturesResponse,
  GetReceiptSignatureSessionParams,
  GetReceiptSignatureSessionResponse,
  CreateReceiptSignatureParams,
  CreateReceiptSignatureBody,
  CreateReceiptSignatureResponse,
  VoidReceiptSignatureParams,
  VoidReceiptSignatureBody,
  VoidReceiptSignatureResponse,
  MarkTechnicianNotificationReadParams,
  MarkTechnicianNotificationReadResponse,
  RetryCallNotificationBody,
  RetryCallNotificationParams,
  RetryCallNotificationResponse,
  SendPublicTrackingMessageBody,
  SendPublicTrackingMessageParams,
  SendPublicTrackingMessageResponse,
  SendServiceCallMessageBody,
  SendServiceCallMessageParams,
  SendServiceCallMessageResponse,
  SendReceiptParams,
  SendReceiptResponse,
  UpdateServiceCallBody,
  UpdateServiceCallParams,
  UpdateServiceCallResponse,
  UpdateServiceCallPhoneSharingBody,
  UpdateServiceCallPhoneSharingParams,
  UpdateServiceCallPhoneSharingResponse,
  UpdateTechnicianProfileBody,
  UpdateTechnicianProfileResponse,
  UpdateReceiptParams,
  UpdateReceiptResponse,
  ClaimServiceCallParams,
  ClaimServiceCallResponse,
} from "@workspace/api-zod";
import {
  contactsTable,
  conversationMessagesTable,
  conversationThreadsTable,
  contractsTable,
  customerPhoneSharingEventsTable,
  db,
  dispatchNotificationOutboxTable,
  phoneIntakesTable,
  trackingSessionsTable,
  technicianNotificationsTable,
  techniciansTable,
  receiptsTable,
  receiptSignaturesTable,
  type Technician,
  type Receipt,
  type ReceiptSignature,
} from "@workspace/db";
import {
  ensureConversationThread,
  getConversation,
  sendConversationMessage,
} from "../lib/conversation";
import { extractServiceCallIntake } from "../lib/service-call-intake";
import {
  listCallNotificationDeliveries,
  listTechnicianNotifications,
  markTechnicianNotificationRead,
  queueDispatchNotifications,
  retryCallNotification,
  unreadTechnicianNotificationCount,
} from "../lib/technician-notifications";
import {
  getTwilioSmsStatus,
  sendTwilioSms,
  SmsConfirmedFailureError,
} from "../lib/twilio-sms";

const router = Router();

function requirePortalSession(req: Request, res: Response, next: () => void) {
  try {
    if (!getAuth(req).userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Failed to validate portal session");
    res.status(401).json({ error: "Authentication required" });
  }
}

function isDispatchWriteConflict(error: unknown) {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    const candidate = current as { code?: string; cause?: unknown };
    if (candidate.code === "40001" || candidate.code === "40P01") return true;
    current = candidate.cause;
  }
  return false;
}

// Tracking-token endpoints are intentionally public. Every other portal
// endpoint is an internal technician endpoint and must reject invalid or
// missing Clerk sessions before its route handler runs.
router.use((req, res, next) => {
  const isPublicTrackingRoute =
    req.path !== "/tracking/sms-status" &&
    (/^\/tracking\/[^/]+(?:\/conversation(?:\/messages)?)?$/.test(req.path) ||
      /^\/receipts\/public\/[^/]+$/.test(req.path));
  if (isPublicTrackingRoute) {
    next();
    return;
  }
  requirePortalSession(req, res, next);
});

const availabilitySchema = z.object({
  availability: z.enum(["available", "busy", "offline"]),
});

const profileText = (max: number) => z.string().trim().max(max).nullable().optional();
const profilePhone = z.string()
  .trim()
  .min(7, "Phone number must be at least 7 characters")
  .max(40, "Phone number is too long")
  .regex(/\d/, "Phone number must include a digit")
  .nullable()
  .optional();

const technicianProfileUpdateSchema = z.object({
  phone: profilePhone,
  specialty: profileText(500),
  baseAddress: profileText(240),
  serviceArea: profileText(240),
  tools: profileText(1000),
  limitations: profileText(1000),
  bio: profileText(1000),
});

const technicianInputSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1),
  phone: z.string().trim().nullable().optional(),
  specialty: z.string().trim().nullable().optional(),
  dispatchLane: z.enum(["general", "roadside"]).default("general"),
});

const technicianUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  ...technicianProfileUpdateSchema.shape,
  dispatchLane: z.enum(["general", "roadside"]).optional(),
  active: z.boolean().optional(),
  role: z.enum(["admin", "technician"]).optional(),
});

const contractInputSchema = z.object({
  technicianId: z.number().int().positive(),
  title: z.string().trim().min(1),
  status: z.enum(["active", "ended"]).default("active"),
  perCallCents: z.number().int().min(0).default(0),
  hourlyRateCents: z.number().int().min(0).default(0),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const callStatusSchema = z.object({
  status: z.enum(["new", "assigned", "in_progress", "completed", "cancelled"]),
});

const assignCallSchema = z.object({
  technicianId: z.number().int().positive(),
});

const paySchema = z.object({
  payCents: z.number().int().min(0),
});

const depositSchema = z.object({
  method: z.enum(["zelle", "cash_app", "venmo", "apple_pay", "cash", "other"]),
  amountCents: z.number().int().positive(),
  reference: z.string().trim().max(200).nullable().optional(),
});

const trackingLinkSchema = z.object({
  expiresInHours: z.number().int().min(1).max(72).default(24),
  sendSms: z.boolean().default(false),
});

const trackingSharingSchema = z.object({
  sharing: z.boolean(),
  etaMinutes: z.number().int().min(0).max(1440).nullable().optional(),
});

const trackingLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).nullable().optional(),
  etaMinutes: z.number().int().min(0).max(1440).nullable().optional(),
});

class CallDeletionConflictError extends Error {}

function serializeTechnicianNotification(notification: {
  id: number;
  callId: number;
  technicianId: number;
  channel: string;
  title: string;
  body: string;
  deliveryStatus: string;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    callId: notification.callId,
    technicianId: notification.technicianId,
    channel: notification.channel,
    title: notification.title,
    body: notification.body,
    deliveryStatus: notification.deliveryStatus,
    readAt: toIso(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
  };
}

function serializeNotificationDelivery(delivery: {
  id: number;
  technicianId: number;
  technicianName: string;
  channel: string;
  deliveryStatus: string;
  providerMessageId: string | null;
  failureReason: string | null;
  sentAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: delivery.id,
    technicianId: delivery.technicianId,
    technicianName: delivery.technicianName,
    channel: delivery.channel,
    deliveryStatus: delivery.deliveryStatus,
    providerMessageId: delivery.providerMessageId,
    failureReason: delivery.failureReason,
    sentAt: toIso(delivery.sentAt),
    createdAt: delivery.createdAt.toISOString(),
  };
}

const isAdmin = (technician: Technician) =>
  technician.role === "owner" || technician.role === "admin";
const isOwner = (technician: Technician) => technician.role === "owner";

const toIso = (value: Date | null | undefined) => value?.toISOString() ?? null;
const isDepositConfirmed = (status: string) =>
  status === "manually_verified" || status === "stripe_verified";
const normalizeUrgency = (urgency: string | null | undefined): "routine" | "soon" | "urgent" => {
  if (urgency === "urgent" || urgency === "high") return "urgent";
  if (urgency === "soon" || urgency === "medium") return "soon";
  return "routine";
};
const hashTrackingToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const receiptSigningPolicy: {
  version: string;
  title: string;
  acknowledgments: string[];
} = {
  version: "payment-acknowledgment-v1",
  title: "Customer payment and service acknowledgment",
  acknowledgments: [
    "I reviewed the receipt details, service description, vehicle information, and amount shown before signing.",
    "I acknowledge that Houston Mobile Mechanic recorded the payment status shown here. This signature does not independently prove that a payment processor cleared the transaction.",
    "I reviewed and accept the Terms of Service and No Refund Policy. Nothing in this acknowledgment waives rights or remedies that cannot legally be waived.",
  ],
};

function serializeReceiptSignature(signature: ReceiptSignature) {
  return {
    ...signature,
    signedAt: signature.signedAt.toISOString(),
    voidedAt: toIso(signature.voidedAt),
    createdAt: signature.createdAt.toISOString(),
  };
}

async function getReceiptSignatureContext(receiptId: number) {
  const [receipt] = await db
    .select()
    .from(receiptsTable)
    .where(eq(receiptsTable.id, receiptId))
    .limit(1);
  if (!receipt) return null;

  const [serviceCall] = receipt.serviceCallId === null
    ? []
    : await db
      .select({ depositStatus: contactsTable.depositStatus })
      .from(contactsTable)
      .where(eq(contactsTable.id, receipt.serviceCallId))
      .limit(1);

  const eligible = receipt.serviceCallId !== null
    && (receipt.paymentMethod === "card" || receipt.paymentMethod === "stripe");
  const paymentVerificationStatus = receipt.paymentMethod === "stripe"
    && serviceCall?.depositStatus === "stripe_verified"
    ? "stripe_verified" as const
    : "recorded_card_payment" as const;
  const paymentStatusLabel = paymentVerificationStatus === "stripe_verified"
    ? "Stripe payment verified"
    : "Card payment recorded";

  return { receipt, eligible, paymentVerificationStatus, paymentStatusLabel };
}

function hasMeaningfulSignature(strokes: Array<{ points: Array<{ x: number; y: number }> }>) {
  const points = strokes.flatMap((stroke) => stroke.points);
  if (points.length < 6 || points.some((point) =>
    !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
    || point.x < 0
    || point.x > 1
    || point.y < 0
    || point.y > 1
  )) return false;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys) >= 0.05;
}

type TrackingLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  updatedAt: string;
};

function serializeLocation(session: {
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  locationUpdatedAt: Date | null;
}): TrackingLocation | null {
  if (
    session.latitude === null ||
    session.longitude === null ||
    session.locationUpdatedAt === null
  ) {
    return null;
  }
  return {
    latitude: session.latitude,
    longitude: session.longitude,
    accuracyMeters: session.accuracyMeters,
    updatedAt: session.locationUpdatedAt.toISOString(),
  };
}

function isSharing(session: {
  expiresAt: Date;
  revokedAt: Date | null;
  sharingStartedAt: Date | null;
  sharingStoppedAt: Date | null;
}, now = new Date()) {
  return (
    session.revokedAt === null &&
    session.expiresAt > now &&
    session.sharingStartedAt !== null &&
    session.sharingStoppedAt === null
  );
}

function serializeTrackingSummary(session: typeof trackingSessionsTable.$inferSelect | null) {
  if (!session) return null;
  const now = new Date();
  const active = session.revokedAt === null && session.expiresAt > now;
  return {
    active,
    expiresAt: session.expiresAt.toISOString(),
    sharing: active && isSharing(session, now),
    etaMinutes: active ? session.etaMinutes : null,
    location: active && isSharing(session, now) ? serializeLocation(session) : null,
  };
}

function serializeTrackingSharing(session: typeof trackingSessionsTable.$inferSelect) {
  return {
    callId: session.contactId,
    sharing: isSharing(session),
    etaMinutes: session.etaMinutes,
    location: serializeLocation(session),
  };
}

function serializeTechnician(technician: Technician) {
  return {
    id: technician.id,
    email: technician.email,
    name: technician.name,
    phone: technician.phone,
    specialty: technician.specialty,
    baseAddress: technician.baseAddress,
    serviceArea: technician.serviceArea,
    tools: technician.tools,
    limitations: technician.limitations,
    bio: technician.bio,
    dispatchLane: technician.dispatchLane,
    role: technician.role,
    availability: technician.availability,
    active: technician.active,
    createdAt: technician.createdAt.toISOString(),
    updatedAt: technician.updatedAt.toISOString(),
  };
}

function serializeCall(row: {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  serviceType: string;
  vehicleType: string;
  description: string;
  urgency: string;
  notes: string | null;
  location: string | null;
  dispatchLane: string;
  status: string;
  assignedTechnicianId: number | null;
  assignedTechnicianName: string | null;
  payCents: number;
  paySetAt: Date | null;
  phoneSharedWithTechnicianAt: Date | null;
  depositStatus: string;
  depositMethod: string | null;
  depositAmountCents: number;
  depositReceivedAt: Date | null;
  depositReference: string | null;
  scheduledAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  tracking?: ReturnType<typeof serializeTrackingSummary>;
}) {
  const { paySetAt, depositStatus, depositAmountCents, urgency, ...call } = row;
  return {
    ...call,
    urgency: normalizeUrgency(urgency),
    depositStatus: isDepositConfirmed(depositStatus) ? depositStatus : "pending",
    depositAmountCents: depositAmountCents > 0 ? depositAmountCents : 5000,
    technicianPaySetAt: toIso(paySetAt),
    phoneSharedWithTechnicianAt: toIso(row.phoneSharedWithTechnicianAt),
    depositReceivedAt: toIso(row.depositReceivedAt),
    scheduledAt: toIso(row.scheduledAt),
    assignedAt: toIso(row.assignedAt),
    completedAt: toIso(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    tracking: row.tracking ?? null,
  };
}

async function currentTechnician(req: Request) {
  const auth = getAuth(req);
  if (!auth.userId) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(techniciansTable)
    .where(eq(techniciansTable.clerkUserId, auth.userId))
    .limit(1);
  if (existing) {
    return existing;
  }

  const clerkUser = await clerkClient.users.getUser(auth.userId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    throw new Error("The signed-in user does not have an email address.");
  }

  const [invitedTechnician] = await db
    .select()
    .from(techniciansTable)
    .where(eq(techniciansTable.email, primaryEmail.toLowerCase()))
    .limit(1);

  if (invitedTechnician) {
    const [linked] = await db
      .update(techniciansTable)
      .set({
        clerkUserId: auth.userId,
        name: invitedTechnician.name || `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || primaryEmail,
        updatedAt: new Date(),
      })
      .where(eq(techniciansTable.id, invitedTechnician.id))
      .returning();
    return linked;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(techniciansTable);

  const [created] = await db
    .insert(techniciansTable)
    .values({
      clerkUserId: auth.userId,
      email: primaryEmail.toLowerCase(),
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || primaryEmail,
      role: count === 0 ? "owner" : "technician",
      availability: "offline",
    })
    .returning();
  return created;
}

async function requireTechnician(req: Request, res: Response) {
  try {
    const technician = await currentTechnician(req);
    if (!technician) {
      res.status(401).json({ error: "Authentication required" });
      return null;
    }
    if (!technician.active) {
      res.status(403).json({ error: "Your technician profile is inactive" });
      return null;
    }
    return technician;
  } catch (error) {
    req.log.error({ err: error }, "Failed to resolve technician profile");
    res.status(500).json({ error: "Could not load technician profile" });
    return null;
  }
}

async function requireAdmin(req: Request, res: Response) {
  const technician = await requireTechnician(req, res);
  if (!technician) return null;
  if (!isAdmin(technician)) {
    res.status(403).json({ error: "Owner or admin access required" });
    return null;
  }
  return technician;
}

async function requireOwner(req: Request, res: Response) {
  const technician = await requireTechnician(req, res);
  if (!technician) return null;
  if (!isOwner(technician)) {
    res.status(403).json({ error: "Owner access required" });
    return null;
  }
  return technician;
}

function classifyServiceCategory(serviceType: string, description: string) {
  const value = `${serviceType} ${description}`.toLowerCase();
  if (/\b(diagnos|no[- ]?start|inspection|check engine)\b/.test(value)) return "diagnostics" as const;
  if (/\b(battery|jump[- ]?start|alternator|starter)\b/.test(value)) return "battery" as const;
  if (/\b(tire|tyre|flat|wheel)\b/.test(value)) return "tires" as const;
  if (/\b(brake|rotor|caliper)\b/.test(value)) return "brakes" as const;
  if (/\b(cooling|coolant|radiator|overheat)\b/.test(value)) return "cooling" as const;
  if (/\b(electrical|wiring|fuse|light)\b/.test(value)) return "electrical" as const;
  if (/\b(engine|motor|spark plug|oil)\b/.test(value)) return "engine" as const;
  if (/\b(roadside|lockout|fuel delivery|tow)\b/.test(value)) return "roadside" as const;
  return "general" as const;
}

function classifyVehicleCategory(vehicleType: string) {
  const value = vehicleType.toLowerCase();
  if (/\b(motorcycle|motorbike|scooter)\b/.test(value)) return "motorcycle" as const;
  if (/\b(commercial|box truck|semi|tractor trailer|fleet)\b/.test(value)) return "commercial" as const;
  if (/\b(suv|crossover)\b/.test(value)) return "suv" as const;
  if (/\b(van|minivan)\b/.test(value)) return "van" as const;
  if (/\b(truck|pickup|f-?150|silverado|tacoma|ram)\b/.test(value)) return "truck" as const;
  if (/\b(car|sedan|coupe|hatchback|convertible|camry|civic|accord|corolla)\b/.test(value)) return "car" as const;
  return "vehicle" as const;
}

const knownVehicleModels: Array<{ make: string; pattern: RegExp; model: string }> = [
  { make: "Ford", pattern: /\bf-?\s*150\b/i, model: "F-150" },
  { make: "Ford", pattern: /\bf-?\s*250\b/i, model: "F-250" },
  { make: "Ford", pattern: /\bf-?\s*350\b/i, model: "F-350" },
  { make: "Ford", pattern: /\b(ranger|escape|explorer|mustang|transit)\b/i, model: "matched" },
  { make: "Chevrolet", pattern: /\b(silverado|tahoe|suburban|equinox|malibu|colorado)\b/i, model: "matched" },
  { make: "Toyota", pattern: /\b(camry|corolla|tacoma|tundra|rav4|highlander|4runner)\b/i, model: "matched" },
  { make: "Honda", pattern: /\b(accord|civic|cr-v|pilot|odyssey)\b/i, model: "matched" },
  { make: "Nissan", pattern: /\b(altima|sentra|rogue|frontier|titan)\b/i, model: "matched" },
  { make: "Ram", pattern: /\b(1500|2500|3500)\b/i, model: "matched" },
  { make: "GMC", pattern: /\b(sierra|yukon|terrain|canyon)\b/i, model: "matched" },
  { make: "Hyundai", pattern: /\b(elantra|sonata|tucson|santa fe)\b/i, model: "matched" },
  { make: "Kia", pattern: /\b(forte|soul|sportage|sorento)\b/i, model: "matched" },
  { make: "Jeep", pattern: /\b(wrangler|grand cherokee|cherokee|compass|gladiator)\b/i, model: "matched" },
  { make: "Tesla", pattern: /\b(model [3ysx])\b/i, model: "matched" },
  { make: "BMW", pattern: /\b(3 series|5 series|x3|x5)\b/i, model: "matched" },
  { make: "Mercedes-Benz", pattern: /\b(c-class|e-class|sprinter)\b/i, model: "matched" },
];

const knownVehicleMakes = knownVehicleModels.map(({ make }) => make);

function safeVehicleDetails(vehicleType: string) {
  const year = vehicleType.match(/\b((?:19|20)\d{2})\b/)?.[1] ?? null;
  const make = knownVehicleMakes.find((candidate) => new RegExp(`\\b${candidate.replace("-", "[- ]?")}\\b`, "i").test(vehicleType)) ?? null;
  const modelMatch = knownVehicleModels.find((candidate) => candidate.make === make && candidate.pattern.test(vehicleType));
  return {
    vehicleYear: year,
    vehicleMake: modelMatch?.make ?? make,
    vehicleModel: modelMatch ? modelMatch.model === "matched"
      ? vehicleType.match(modelMatch.pattern)?.[1]?.replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? null
      : modelMatch.model
      : null,
  };
}

function generalServiceArea(location: string | null) {
  if (!location?.trim()) return null;
  return "Houston area";
}

function locationZip(location: string | null) {
  const match = location?.match(/(?:^|[\s,])(\d{5})(?:-\d{4})?\s*$/);
  return match?.[1] ?? null;
}

function redactPhoneNumbers(value: string | null) {
  return value?.replace(
    /(?<!\w)(?:\+?\d[\d().\s-]{6,}\d)(?!\w)/g,
    "[phone hidden]",
  ) ?? null;
}

async function fetchAvailableCalls() {
  const rows = await db
    .select()
    .from(contactsTable)
    .where(and(
      eq(contactsTable.status, "new"),
      isNull(contactsTable.assignedTechnicianId),
    ))
    .orderBy(desc(contactsTable.createdAt));

  return rows.map((call) => ({
    id: call.id,
    serviceCategory: classifyServiceCategory(call.serviceType, call.description),
    vehicleCategory: classifyVehicleCategory(call.vehicleType),
    ...safeVehicleDetails(call.vehicleType),
    urgency: normalizeUrgency(call.urgency),
    dispatchLane: call.dispatchLane === "roadside" ? "roadside" as const : "general" as const,
    status: "new" as const,
    payCents: call.payCents ?? 0,
    technicianPaySetAt: call.paySetAt?.toISOString() ?? null,
    locationArea: generalServiceArea(call.location),
    locationZip: locationZip(call.location),
    scheduledAt: call.scheduledAt?.toISOString() ?? null,
    createdAt: call.createdAt.toISOString(),
  }));
}

function trackingOrigin() {
  const configuredOrigin = process.env.PUBLIC_APP_ORIGIN;
  if (configuredOrigin) {
    const parsedOrigin = new URL(configuredOrigin);
    if (parsedOrigin.protocol !== "https:") {
      throw new Error("PUBLIC_APP_ORIGIN must use HTTPS");
    }
    return parsedOrigin.origin;
  }

  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim()
    ?? process.env.REPLIT_DEV_DOMAIN?.trim();
  if (!replitDomain) {
    throw new Error("A canonical public app origin is required for tracking links");
  }
  return `https://${replitDomain}`;
}

async function sendTrackingLinkSms(phone: string, url: string, expiresAt: Date) {
  await sendTwilioSms(
    phone,
    `Houston Mobile Mechanic: follow your technician here: ${url}. This private link expires ${expiresAt.toLocaleString("en-US", { timeZone: "America/Chicago" })}.`,
  );
  return true;
}

function serializeReceipt(receipt: Receipt) {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    serviceCallId: receipt.serviceCallId,
    customerName: receipt.customerName,
    customerPhone: receipt.customerPhone,
    customerAddress: receipt.customerAddress,
    vehicleYear: receipt.vehicleYear,
    vehicleMake: receipt.vehicleMake,
    vehicleModel: receipt.vehicleModel,
    receiptDate: receipt.receiptDate,
    serviceDescription: receipt.serviceDescription,
    amountPaidCents: receipt.amountPaidCents,
    paymentMethod: receipt.paymentMethod,
    notes: receipt.notes,
    accessTokenExpiresAt: receipt.accessTokenExpiresAt,
    deliveryStatus: receipt.deliveryStatus,
    providerMessageId: receipt.providerMessageId,
    deliveryFailureReason: receipt.deliveryFailureReason,
    sentAt: toIso(receipt.sentAt),
    createdBy: receipt.createdBy,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
  };
}

function receiptCustomerUrl(token: string) {
  return `${trackingOrigin()}/receipt/${token}`;
}

function receiptSmsBody(receipt: Receipt, url: string) {
  if (!receipt.accessTokenExpiresAt) {
    throw new SmsConfirmedFailureError("Receipt link expiry could not be prepared.");
  }
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(receipt.amountPaidCents / 100);
  const expires = receipt.accessTokenExpiresAt.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
  });
  return `Houston Mobile Mechanic receipt ${receipt.receiptNumber}: ${amount} paid on ${receipt.receiptDate}. View or save your receipt: ${url}. This private link expires ${expires}.`;
}

export function receiptDeliveryStatusForError(error: unknown) {
  return error instanceof SmsConfirmedFailureError ? "failed" as const : "unknown" as const;
}

function receiptDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function requireAccessibleCall(
  technician: Technician,
  callId: number,
  res: Response,
) {
  const [call] = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, callId))
    .limit(1);
  if (!call) {
    res.status(404).json({ error: "Customer call not found" });
    return null;
  }
  if (!isAdmin(technician) && call.assignedTechnicianId !== technician.id) {
    res.status(403).json({ error: "You can only access conversations for calls assigned to you" });
    return null;
  }
  return call;
}

async function resolvePublicTracking(token: string) {
  if (token.length < 32 || token.length > 128) return null;

  const [result] = await db
    .select({
      session: trackingSessionsTable,
      callId: contactsTable.id,
      status: contactsTable.status,
      depositStatus: contactsTable.depositStatus,
    })
    .from(trackingSessionsTable)
    .innerJoin(contactsTable, eq(trackingSessionsTable.contactId, contactsTable.id))
    .where(eq(trackingSessionsTable.tokenHash, hashTrackingToken(token)))
    .limit(1);

  if (
    !result ||
    result.session.revokedAt !== null ||
    result.session.expiresAt <= new Date() ||
    !isDepositConfirmed(result.depositStatus)
  ) {
    return null;
  }
  return result;
}

async function fetchCalls(technician: Technician, requestedStatus?: string) {
  const allowedStatuses = ["new", "assigned", "in_progress", "completed", "cancelled"];
  const status = requestedStatus && allowedStatuses.includes(requestedStatus) ? requestedStatus : undefined;
  const conditions = [
    ...(isAdmin(technician) ? [] : [eq(contactsTable.assignedTechnicianId, technician.id)]),
    ...(status ? [eq(contactsTable.status, status)] : []),
  ];

  const rows = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      phone: contactsTable.phone,
      email: contactsTable.email,
      serviceType: contactsTable.serviceType,
      vehicleType: contactsTable.vehicleType,
      description: contactsTable.description,
      urgency: contactsTable.urgency,
      notes: contactsTable.notes,
      location: contactsTable.location,
      dispatchLane: contactsTable.dispatchLane,
      status: contactsTable.status,
      assignedTechnicianId: contactsTable.assignedTechnicianId,
      assignedTechnicianName: techniciansTable.name,
      payCents: contactsTable.payCents,
      paySetAt: contactsTable.paySetAt,
      phoneSharedWithTechnicianAt: contactsTable.phoneSharedWithTechnicianAt,
      depositStatus: contactsTable.depositStatus,
      depositMethod: contactsTable.depositMethod,
      depositAmountCents: contactsTable.depositAmountCents,
      depositReceivedAt: contactsTable.depositReceivedAt,
      depositReference: contactsTable.depositReference,
      scheduledAt: contactsTable.scheduledAt,
      assignedAt: contactsTable.assignedAt,
      completedAt: contactsTable.completedAt,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(techniciansTable, eq(contactsTable.assignedTechnicianId, techniciansTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contactsTable.createdAt));

  const callIds = rows.map((row) => row.id);
  const trackingRows = callIds.length
    ? await db
        .select()
        .from(trackingSessionsTable)
        .where(inArray(trackingSessionsTable.contactId, callIds))
        .orderBy(desc(trackingSessionsTable.createdAt))
    : [];
  const latestTrackingByCall = new Map<number, typeof trackingRows[number]>();
  for (const tracking of trackingRows) {
    if (!latestTrackingByCall.has(tracking.contactId)) {
      latestTrackingByCall.set(tracking.contactId, tracking);
    }
  }

  return rows.map((row) =>
    serializeCall({
      ...row,
      phone:
        isOwner(technician) ||
        (row.assignedTechnicianId === technician.id &&
          row.phoneSharedWithTechnicianAt !== null)
          ? row.phone
          : null,
      tracking: serializeTrackingSummary(latestTrackingByCall.get(row.id) ?? null),
    }),
  );
}

router.get("/technicians/me", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  res.json(serializeTechnician(technician));
});

router.patch("/technicians/me", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;

  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid availability", details: parsed.error.issues });
    return;
  }

  const [updated] = await db
    .update(techniciansTable)
    .set({ availability: parsed.data.availability, updatedAt: new Date() })
    .where(eq(techniciansTable.id, technician.id))
    .returning();
  res.json(serializeTechnician(updated));
});

router.patch("/technicians/me/profile", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;

  const normalizedProfileBody = Object.fromEntries(
    Object.entries(req.body ?? {}).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === "" ? null : value,
    ]),
  );
  const contract = UpdateTechnicianProfileBody.safeParse(normalizedProfileBody);
  const parsed = contract.success
    ? technicianProfileUpdateSchema.safeParse(contract.data)
    : contract;
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Invalid technician profile", details: parsed.error?.issues });
    return;
  }

  const profileFields = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [key, value === "" ? null : value]),
  );
  const [updated] = await db
    .update(techniciansTable)
    .set({ ...profileFields, updatedAt: new Date() })
    .where(eq(techniciansTable.id, technician.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Technician profile not found" });
    return;
  }

  res.json(UpdateTechnicianProfileResponse.parse(serializeTechnician(updated)));
});

router.get("/technicians/dashboard", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;

  const calls = await fetchCalls(technician);
  const assignedCalls = isAdmin(technician)
    ? calls
    : calls.filter((call) => call.assignedTechnicianId === technician.id);
  const earningsCents = assignedCalls
    .filter((call) => call.status !== "cancelled" && call.technicianPaySetAt !== null)
    .reduce((total, call) => total + call.payCents, 0);
  const completedCalls = assignedCalls.filter((call) => call.status === "completed").length;
  const [{ availableTechnicians }] = await db
    .select({ availableTechnicians: sql<number>`count(*)::int` })
    .from(techniciansTable)
    .where(eq(techniciansTable.availability, "available"));

  res.json({
    technician: serializeTechnician(technician),
    calls: assignedCalls,
    earningsCents,
    completedCalls,
    availableTechnicians: isAdmin(technician) ? availableTechnicians : 0,
  });
});

router.get("/technician-notifications", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;

  const [notifications, unreadCount] = await Promise.all([
    listTechnicianNotifications(technician.id),
    unreadTechnicianNotificationCount(technician.id),
  ]);
  res.json(GetTechnicianNotificationsResponse.parse({
    notifications: notifications.map(serializeTechnicianNotification),
    unreadCount,
  }));
});

router.patch("/technician-notifications/:id/read", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const params = MarkTechnicianNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification." });
    return;
  }

  const updated = await markTechnicianNotificationRead(params.data.id, technician.id);
  if (!updated) {
    res.status(404).json({ error: "Notification not found." });
    return;
  }
  res.json(MarkTechnicianNotificationReadResponse.parse(serializeTechnicianNotification(updated)));
});

router.get("/technicians", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const technicians = await db.select().from(techniciansTable).orderBy(techniciansTable.name);
  res.json(technicians.map(serializeTechnician));
});

router.post("/technicians", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const parsed = technicianInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid technician", details: parsed.error.issues });
    return;
  }
  const data = { ...parsed.data, email: parsed.data.email.toLowerCase() };
  const [existing] = await db.select().from(techniciansTable).where(eq(techniciansTable.email, data.email)).limit(1);
  if (existing) {
    res.status(409).json({ error: "A technician with that email already exists" });
    return;
  }

  const [created] = await db
    .insert(techniciansTable)
    .values({
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      specialty: data.specialty ?? null,
      dispatchLane: data.dispatchLane,
      role: "technician",
      availability: "offline",
    })
    .returning();
  req.log.info({ technicianId: created.id }, "Technician added");
  res.status(201).json(serializeTechnician(created));
});

router.patch("/technicians/:id", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid technician id" });
    return;
  }

  const parsed = technicianUpdateSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Invalid technician update", details: parsed.error?.issues });
    return;
  }
  let result: { updated: Technician | null; conflict: boolean };
  try {
    result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(techniciansTable)
        .where(eq(techniciansTable.id, id))
        .limit(1);
      if (!current) return { updated: null, conflict: false };

      const nextDispatchLane = parsed.data.dispatchLane ?? current.dispatchLane;
      if (nextDispatchLane !== current.dispatchLane) {
        const [conflictingAssignment] = await tx
          .select({ id: contactsTable.id })
          .from(contactsTable)
          .where(and(
            eq(contactsTable.assignedTechnicianId, current.id),
            ne(contactsTable.dispatchLane, nextDispatchLane),
          ))
          .limit(1);
        if (conflictingAssignment) return { updated: null, conflict: true };
      }

      const [updated] = await tx
        .update(techniciansTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(techniciansTable.id, id))
        .returning();
      return { updated: updated ?? null, conflict: false };
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (isDispatchWriteConflict(error)) {
      res.status(409).json({ error: "Dispatch routing changed at the same time. Refresh and try again." });
      return;
    }
    throw error;
  }
  if (result.conflict) {
    res.status(409).json({ error: "Reassign this technician's active calls before changing their dispatch lane." });
    return;
  }
  if (!result.updated) {
    res.status(404).json({ error: "Technician not found" });
    return;
  }
  res.json(serializeTechnician(result.updated));
});

router.get("/calls", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  res.json(await fetchCalls(technician, status));
});

router.get("/calls/available", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  if (isAdmin(technician)) {
    res.status(403).json({ error: "Active technician access required." });
    return;
  }

  res.json(ListAvailableServiceCallsResponse.parse(await fetchAvailableCalls()));
});

router.get("/calls/:id/preview", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  if (isAdmin(technician)) {
    res.status(403).json({ error: "Active technician access required." });
    return;
  }

  const params = GetAvailableServiceCallPreviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid service call." });
    return;
  }

  const [call] = await db
    .select()
    .from(contactsTable)
    .where(and(
      eq(contactsTable.id, params.data.id),
      eq(contactsTable.status, "new"),
      isNull(contactsTable.assignedTechnicianId),
    ))
    .limit(1);

  if (!call) {
    res.status(404).json({ error: "This job is no longer available." });
    return;
  }

  res.json(GetAvailableServiceCallPreviewResponse.parse(serializeCall({
    ...call,
    name: redactPhoneNumbers(call.name) ?? call.name,
    phone: null,
    email: call.email,
    serviceType: redactPhoneNumbers(call.serviceType) ?? call.serviceType,
    vehicleType: redactPhoneNumbers(call.vehicleType) ?? call.vehicleType,
    description: redactPhoneNumbers(call.description) ?? call.description,
    notes: redactPhoneNumbers(call.notes),
    assignedTechnicianName: null,
    tracking: null,
  })));
});

router.get("/receipts", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const stalledSendBefore = new Date(Date.now() - 15 * 60 * 1_000);
  await db
    .update(receiptsTable)
    .set({
      deliveryStatus: "unknown",
      deliveryFailureReason: "Sending did not finish before the safety timeout. Verify delivery with the customer before trying again.",
      updatedAt: new Date(),
    })
    .where(and(
      eq(receiptsTable.deliveryStatus, "sending"),
      lt(receiptsTable.sendStartedAt, stalledSendBefore),
    ));

  const receipts = await db
    .select()
    .from(receiptsTable)
    .orderBy(desc(receiptsTable.createdAt));
  res.json(ListReceiptsResponse.parse(receipts.map(serializeReceipt)));
});

router.get("/receipts/signatures", async (req, res): Promise<void> => {
  const technician = await requireOwner(req, res);
  if (!technician) return;

  const signatures = await db
    .select()
    .from(receiptSignaturesTable)
    .orderBy(desc(receiptSignaturesTable.createdAt));
  const latestByReceipt = new Map<number, ReceiptSignature>();
  for (const signature of signatures) {
    if (!latestByReceipt.has(signature.receiptId)) latestByReceipt.set(signature.receiptId, signature);
  }
  const receipts = await db.select({ id: receiptsTable.id }).from(receiptsTable);
  res.json(ListReceiptSignaturesResponse.parse(receipts.map(({ id }) => {
    const signature = latestByReceipt.get(id);
    return {
      receiptId: id,
      status: !signature ? "unsigned" : signature.voidedAt ? "voided" : "signed",
      signatureId: signature?.id ?? null,
      signerName: signature?.signerName ?? null,
      signedAt: toIso(signature?.signedAt),
      voidedAt: toIso(signature?.voidedAt),
    };
  })));
});

router.get("/receipts/:id/signature-session", async (req, res): Promise<void> => {
  const technician = await requireOwner(req, res);
  if (!technician) return;
  const params = GetReceiptSignatureSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid receipt." });
    return;
  }
  const context = await getReceiptSignatureContext(params.data.id);
  if (!context) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }
  if (!context.eligible) {
    res.status(400).json({ error: "Only card-paid receipts linked to a service call can be signed." });
    return;
  }
  const [existingSignature] = await db
    .select()
    .from(receiptSignaturesTable)
    .where(eq(receiptSignaturesTable.receiptId, params.data.id))
    .orderBy(desc(receiptSignaturesTable.createdAt))
    .limit(1);
  res.json(GetReceiptSignatureSessionResponse.parse({
    receipt: serializeReceipt(context.receipt),
    paymentVerificationStatus: context.paymentVerificationStatus,
    paymentStatusLabel: context.paymentStatusLabel,
    policy: receiptSigningPolicy,
    existingSignature: existingSignature ? serializeReceiptSignature(existingSignature) : null,
  }));
});

router.post("/receipts/:id/signature", async (req, res): Promise<void> => {
  const technician = await requireOwner(req, res);
  if (!technician) return;
  const params = CreateReceiptSignatureParams.safeParse(req.params);
  const parsed = CreateReceiptSignatureBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid payment acknowledgment." });
    return;
  }
  if (!parsed.data.electronicConsent || !parsed.data.policyAcknowledged) {
    res.status(400).json({ error: "Electronic-signature consent and policy acknowledgment are required." });
    return;
  }
  const signerName = parsed.data.signerName.trim();
  if (!signerName) {
    res.status(400).json({ error: "Enter the customer's printed name before saving." });
    return;
  }
  if (!hasMeaningfulSignature(parsed.data.signatureStrokes)) {
    res.status(400).json({ error: "Draw a complete signature before saving." });
    return;
  }
  const context = await getReceiptSignatureContext(params.data.id);
  if (!context) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }
  if (!context.eligible) {
    res.status(400).json({ error: "Only card-paid receipts linked to a service call can be signed." });
    return;
  }
  const receiptSnapshot = {
    receiptNumber: context.receipt.receiptNumber,
    customerName: context.receipt.customerName,
    customerAddress: context.receipt.customerAddress,
    vehicleYear: context.receipt.vehicleYear,
    vehicleMake: context.receipt.vehicleMake,
    vehicleModel: context.receipt.vehicleModel,
    receiptDate: context.receipt.receiptDate,
    serviceDescription: context.receipt.serviceDescription,
    amountPaidCents: context.receipt.amountPaidCents,
    paymentMethod: context.receipt.paymentMethod,
    paymentStatusLabel: context.paymentStatusLabel,
  };
  const documentHash = createHash("sha256").update(JSON.stringify({
    receiptSnapshot,
    policy: receiptSigningPolicy,
    signerName,
    signatureStrokes: parsed.data.signatureStrokes,
  })).digest("hex");
  try {
    const [created] = await db
      .insert(receiptSignaturesTable)
      .values({
        receiptId: context.receipt.id,
        documentVersion: receiptSigningPolicy.version,
        receiptSnapshot,
        policySnapshot: receiptSigningPolicy,
        paymentVerificationStatus: context.paymentVerificationStatus,
        signerName,
        signatureStrokes: parsed.data.signatureStrokes,
        electronicConsent: true,
        policyAcknowledged: true,
        signedBy: technician.clerkUserId ?? technician.email,
        documentHash,
      })
      .returning();
    req.log.info({ receiptId: context.receipt.id, signatureId: created.id }, "Receipt payment acknowledgment signed");
    res.status(201).json(CreateReceiptSignatureResponse.parse(serializeReceiptSignature(created)));
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } };
    if (databaseError.code === "23505" || databaseError.cause?.code === "23505") {
      res.status(409).json({ error: "This receipt already has an active signature. Void it before re-signing." });
      return;
    }
    throw error;
  }
});

router.post("/receipts/:id/signature/void", async (req, res): Promise<void> => {
  const technician = await requireOwner(req, res);
  if (!technician) return;
  const params = VoidReceiptSignatureParams.safeParse(req.params);
  const parsed = VoidReceiptSignatureBody.safeParse(req.body);
  if (!params.success || !parsed.success || !parsed.data.reason.trim()) {
    res.status(400).json({ error: "A reason is required to void a signature." });
    return;
  }
  const [voided] = await db
    .update(receiptSignaturesTable)
    .set({
      voidedAt: new Date(),
      voidedBy: technician.clerkUserId ?? technician.email,
      voidReason: parsed.data.reason.trim(),
    })
    .where(and(
      eq(receiptSignaturesTable.id, parsed.data.signatureId),
      eq(receiptSignaturesTable.receiptId, params.data.id),
      isNull(receiptSignaturesTable.voidedAt),
    ))
    .returning();
  if (!voided) {
    res.status(404).json({ error: "No active signature was found." });
    return;
  }
  req.log.warn({ receiptId: params.data.id, signatureId: voided.id }, "Receipt payment acknowledgment voided");
  res.json(VoidReceiptSignatureResponse.parse(serializeReceiptSignature(voided)));
});

router.post("/receipts", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;

  const parsed = CreateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid receipt", details: parsed.error.issues });
    return;
  }

  const data = parsed.data;
  const serviceCallId = data.serviceCallId ?? null;
  let customerPhone = data.customerPhone?.trim() || null;
  if (serviceCallId !== null) {
    const [serviceCall] = await db
      .select({ id: contactsTable.id, phone: contactsTable.phone })
      .from(contactsTable)
      .where(eq(contactsTable.id, serviceCallId))
      .limit(1);
    if (!serviceCall) {
      res.status(404).json({ error: "Customer service call not found" });
      return;
    }
    if (!isAdmin(technician)) {
      const [assignment] = await db
        .select({ assignedTechnicianId: contactsTable.assignedTechnicianId })
        .from(contactsTable)
        .where(eq(contactsTable.id, serviceCallId))
        .limit(1);
      if (assignment?.assignedTechnicianId !== technician.id) {
        res.status(403).json({ error: "You can only create receipts for your assigned service calls." });
        return;
      }
    }
    customerPhone = serviceCall.phone;
  } else if (!isAdmin(technician)) {
    res.status(403).json({ error: "Select one of your assigned service calls to create a receipt." });
    return;
  }
  if (!customerPhone) {
    res.status(400).json({ error: "Enter a customer phone number for a manual receipt." });
    return;
  }

  const receiptNumber = `HMM-${new Date().getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
  const [created] = await db
    .insert(receiptsTable)
    .values({
      receiptNumber,
      serviceCallId,
      customerName: data.customerName.trim(),
      customerPhone,
      customerAddress: data.customerAddress?.trim() || null,
      vehicleYear: data.vehicleYear?.trim() || null,
      vehicleMake: data.vehicleMake?.trim() || null,
      vehicleModel: data.vehicleModel?.trim() || null,
      receiptDate: receiptDateString(data.receiptDate),
      serviceDescription: data.serviceDescription.trim(),
      amountPaidCents: Math.round(data.amountPaidCents),
      paymentMethod: data.paymentMethod,
      notes: data.notes?.trim() || null,
      createdBy: technician.clerkUserId ?? technician.email,
    })
    .returning();

  req.log.info({ receiptId: created.id, serviceCallId }, "Customer receipt created");
  res.status(201).json(CreateReceiptResponse.parse(serializeReceipt(created)));
});

router.patch("/receipts/:id", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const params = UpdateReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid receipt." });
    return;
  }
  const parsed = CreateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid receipt", details: parsed.error.issues });
    return;
  }
  const [activeSignature] = await db
    .select({ id: receiptSignaturesTable.id })
    .from(receiptSignaturesTable)
    .where(and(
      eq(receiptSignaturesTable.receiptId, params.data.id),
      isNull(receiptSignaturesTable.voidedAt),
    ))
    .limit(1);
  if (activeSignature) {
    res.status(409).json({ error: "Void the signed acknowledgment before editing this receipt." });
    return;
  }

  const data = parsed.data;
  const serviceCallId = data.serviceCallId ?? null;
  let customerPhone = data.customerPhone?.trim() || null;
  if (serviceCallId !== null) {
    const [serviceCall] = await db
      .select({ id: contactsTable.id, phone: contactsTable.phone })
      .from(contactsTable)
      .where(eq(contactsTable.id, serviceCallId))
      .limit(1);
    if (!serviceCall) {
      res.status(404).json({ error: "Customer service call not found" });
      return;
    }
    customerPhone = serviceCall.phone;
  }
  if (!customerPhone) {
    res.status(400).json({ error: "Enter a customer phone number for a manual receipt." });
    return;
  }

  const [updated] = await db
    .update(receiptsTable)
    .set({
      serviceCallId,
      customerName: data.customerName.trim(),
      customerPhone,
      customerAddress: data.customerAddress?.trim() || null,
      vehicleYear: data.vehicleYear?.trim() || null,
      vehicleMake: data.vehicleMake?.trim() || null,
      vehicleModel: data.vehicleModel?.trim() || null,
      receiptDate: receiptDateString(data.receiptDate),
      serviceDescription: data.serviceDescription.trim(),
      amountPaidCents: Math.round(data.amountPaidCents),
      paymentMethod: data.paymentMethod,
      notes: data.notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(receiptsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }
  req.log.info({ receiptId: updated.id, serviceCallId }, "Customer receipt updated");
  res.json(UpdateReceiptResponse.parse(serializeReceipt(updated)));
});

router.post("/receipts/:id/send", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const params = SendReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid receipt." });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000);
  const now = new Date();
  const [claimed] = await db
    .update(receiptsTable)
    .set({
      accessTokenHash: hashTrackingToken(token),
      accessTokenExpiresAt: tokenExpiresAt,
      deliveryStatus: "sending",
      providerMessageId: null,
      deliveryFailureReason: null,
      sendStartedAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(receiptsTable.id, params.data.id),
      inArray(receiptsTable.deliveryStatus, ["not_sent", "failed"]),
    ))
    .returning();

  if (!claimed) {
    const [current] = await db
      .select({ deliveryStatus: receiptsTable.deliveryStatus })
      .from(receiptsTable)
      .where(eq(receiptsTable.id, params.data.id))
      .limit(1);
    if (!current) {
      res.status(404).json({ error: "Receipt not found." });
      return;
    }
    const message = current.deliveryStatus === "unknown"
      ? "SMS delivery is uncertain. Verify with the customer before sending another receipt."
      : current.deliveryStatus === "sending"
        ? "This receipt SMS is already being sent. Wait for its delivery state to resolve."
        : "This receipt has already been sent and cannot be sent again.";
    res.status(409).json({ error: message });
    return;
  }

  let customerUrl: string;
  let providerMessageId: string | null;
  try {
    customerUrl = receiptCustomerUrl(token);
    providerMessageId = await sendTwilioSms(
      claimed.customerPhone,
      receiptSmsBody(claimed, customerUrl),
    );
  } catch (error) {
    const deliveryStatus = receiptDeliveryStatusForError(error);
    const failureReason = error instanceof Error
      ? error.message
      : "Receipt SMS delivery could not be confirmed.";
    const [updated] = await db
      .update(receiptsTable)
      .set({
        deliveryStatus,
        deliveryFailureReason: failureReason,
        updatedAt: new Date(),
      })
      .where(eq(receiptsTable.id, claimed.id))
      .returning();
    req.log.warn({ receiptId: claimed.id, deliveryStatus, failureReason }, "Customer receipt SMS was not confirmed");
    res.json(SendReceiptResponse.parse({
      receipt: serializeReceipt(updated),
      deliveryStatus,
      customerUrl: null,
      message: deliveryStatus === "unknown"
        ? "Twilio did not confirm whether the receipt SMS was accepted. Verify with the customer before trying again."
        : "Twilio rejected the receipt SMS before accepting it. You can correct the phone number by creating a new receipt or retry this confirmed failure.",
    }));
    return;
  }

  try {
    const [sent] = await db
      .update(receiptsTable)
      .set({
        deliveryStatus: "sent",
        providerMessageId,
        deliveryFailureReason: null,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(receiptsTable.id, claimed.id))
      .returning();
    req.log.info({ receiptId: claimed.id, providerMessageId }, "Customer receipt SMS accepted by Twilio");
    res.json(SendReceiptResponse.parse({
      receipt: serializeReceipt(sent),
      deliveryStatus: "sent",
      customerUrl,
      message: "Receipt link sent by SMS.",
    }));
  } catch (error) {
    const failureReason = error instanceof Error
      ? error.message
      : "Receipt SMS acceptance could not be recorded.";
    const [updated] = await db
      .update(receiptsTable)
      .set({
        deliveryStatus: "unknown",
        deliveryFailureReason: failureReason,
        updatedAt: new Date(),
      })
      .where(eq(receiptsTable.id, claimed.id))
      .returning();
    req.log.warn({ receiptId: claimed.id, deliveryStatus: "unknown", failureReason }, "Customer receipt SMS acceptance was not fully recorded");
    res.json(SendReceiptResponse.parse({
      receipt: serializeReceipt(updated),
      deliveryStatus: "unknown",
      customerUrl: null,
      message: "Twilio may have accepted the receipt SMS, but its delivery record could not be completed. Verify with the customer before trying again.",
    }));
  }
});

router.get("/calls/:id/conversation", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const params = GetServiceCallConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid service call" });
    return;
  }
  const call = await requireAccessibleCall(technician, params.data.id, res);
  if (!call) return;

  res.json(GetServiceCallConversationResponse.parse(await getConversation(call.id, "staff")));
});

router.post("/calls/:id/conversation/messages", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const params = SendServiceCallMessageParams.safeParse(req.params);
  const body = SendServiceCallMessageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Enter a message between 1 and 2000 characters." });
    return;
  }
  const call = await requireAccessibleCall(technician, params.data.id, res);
  if (!call) return;
  if (["completed", "cancelled"].includes(call.status)) {
    res.status(400).json({ error: "Messages cannot be sent for a closed call." });
    return;
  }

  const conversation = await sendConversationMessage({
    contactId: call.id,
    viewer: "staff",
    senderRole: isAdmin(technician) ? "admin" : "technician",
    body: body.data.body.trim(),
    authorTechnicianId: technician.id,
    authorClerkUserId: technician.clerkUserId,
  });
  req.log.info({ callId: call.id, senderRole: isAdmin(technician) ? "admin" : "technician" }, "Service call message sent");
  res.status(201).json(SendServiceCallMessageResponse.parse(conversation));
});

router.post("/calls", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const parsed = CreateServiceCallBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid service call", details: parsed.error.issues });
    return;
  }

  const data = parsed.data;
  const created = await db.transaction(async (tx) => {
    const [call] = await tx
      .insert(contactsTable)
      .values({
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        serviceType: data.serviceType.trim(),
        vehicleType: data.vehicleType.trim(),
        description: data.description.trim(),
        urgency: data.urgency ?? "routine",
        notes: data.notes?.trim() || null,
        location: data.location?.trim() || null,
        dispatchLane: data.dispatchLane ?? "general",
        payCents: data.payCents ?? 0,
        paySetAt: data.payCents === undefined ? null : new Date(),
        status: "new",
      })
      .returning();
    await tx.insert(dispatchNotificationOutboxTable).values({ callId: call.id });
    return call;
  });

  const createdCall = (await fetchCalls(technician)).find((call) => call.id === created.id);
  if (!createdCall) {
    req.log.error({ callId: created.id }, "Created service call could not be loaded");
    res.status(500).json({ error: "Service call was created but could not be loaded" });
    return;
  }

  req.log.info({ callId: created.id }, "Service call created from dispatch intake");
  void queueDispatchNotifications(created.id).catch((error) => {
    req.log.error({ err: error, callId: created.id }, "Dispatch notification recovery enqueue failed");
  });
  res.status(201).json(CreateServiceCallResponse.parse(createdCall));
});

router.patch("/calls/:id", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const params = UpdateServiceCallParams.safeParse(req.params);
  const parsed = UpdateServiceCallBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid service call update", details: parsed.error?.issues });
    return;
  }

  const data = parsed.data;
  if (data.phone !== undefined && !isOwner(technician)) {
    res.status(403).json({ error: "Only the owner can change a customer's phone number." });
    return;
  }
  let result: { updatedId: number | null; conflict: boolean };
  try {
    result = await db.transaction(async (tx) => {
      const [existingCall] = await tx
        .select()
        .from(contactsTable)
        .where(eq(contactsTable.id, params.data.id))
        .limit(1);
      if (!existingCall) return { updatedId: null, conflict: false };

      const nextDispatchLane = data.dispatchLane ?? existingCall.dispatchLane;
      if (existingCall.assignedTechnicianId !== null && nextDispatchLane !== existingCall.dispatchLane) {
        const [assignedTechnician] = await tx
          .select({ dispatchLane: techniciansTable.dispatchLane })
          .from(techniciansTable)
          .where(eq(techniciansTable.id, existingCall.assignedTechnicianId))
          .limit(1);
        if (!assignedTechnician || assignedTechnician.dispatchLane !== nextDispatchLane) {
          return { updatedId: null, conflict: true };
        }
      }

      const [updated] = await tx
        .update(contactsTable)
        .set({
          name: data.name.trim(),
          ...(data.phone === undefined ? {} : { phone: data.phone.trim() }),
          email: data.email?.trim() || null,
          serviceType: data.serviceType.trim(),
          vehicleType: data.vehicleType.trim(),
          description: data.description.trim(),
          urgency: data.urgency ?? normalizeUrgency(existingCall.urgency),
          notes: data.notes?.trim() || null,
          location: data.location?.trim() || null,
          dispatchLane: nextDispatchLane,
          ...(data.payCents === undefined
            ? {}
            : {
                payCents: data.payCents ?? 0,
                paySetAt: data.payCents === null ? null : new Date(),
              }),
        })
        .where(eq(contactsTable.id, params.data.id))
        .returning();
      return { updatedId: updated?.id ?? null, conflict: false };
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (isDispatchWriteConflict(error)) {
      res.status(409).json({ error: "Dispatch routing changed at the same time. Refresh and try again." });
      return;
    }
    throw error;
  }
  if (result.conflict) {
    res.status(409).json({
      error: "This call already has a technician assigned in a different dispatch lane. Reassign the call before changing its lane.",
    });
    return;
  }
  if (!result.updatedId) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }

  const serialized = (await fetchCalls(technician)).find((call) => call.id === result.updatedId);
  if (!serialized) {
    res.status(500).json({ error: "Customer call was updated but could not be loaded" });
    return;
  }
  req.log.info({ callId: result.updatedId, updatedBy: technician.id }, "Service call details updated");
  res.json(UpdateServiceCallResponse.parse(serialized));
});

router.delete("/calls/:id", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const params = DeleteServiceCallParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid service call." });
    return;
  }

  const callId = params.data.id;
  const [existingCall] = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, callId))
    .limit(1);
  if (!existingCall) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  try {
    await db.transaction(async (tx) => {
      const [eligibleCall] = await tx
        .select({ id: contactsTable.id })
        .from(contactsTable)
        .where(
          and(
            eq(contactsTable.id, callId),
            inArray(contactsTable.status, ["new", "cancelled"]),
          ),
        )
        .limit(1);
      if (!eligibleCall) {
        throw new CallDeletionConflictError(
          "Only new or cancelled calls can be deleted. Active and completed calls must remain in the dispatch history.",
        );
      }

      const now = new Date();
      await tx
        .update(technicianNotificationsTable)
        .set({
          deliveryStatus: "cancelled",
          failureReason: "Cancelled because the service call was deleted.",
          updatedAt: now,
        })
        .where(
          and(
            eq(technicianNotificationsTable.callId, callId),
            eq(technicianNotificationsTable.channel, "sms"),
            eq(technicianNotificationsTable.deliveryStatus, "pending"),
          ),
        );
      const [activeSms] = await tx
        .select({ id: technicianNotificationsTable.id })
        .from(technicianNotificationsTable)
        .where(
          and(
            eq(technicianNotificationsTable.callId, callId),
            eq(technicianNotificationsTable.channel, "sms"),
            eq(technicianNotificationsTable.deliveryStatus, "sending"),
          ),
        )
        .limit(1);
      if (activeSms) {
        throw new CallDeletionConflictError(
          "A technician SMS is still being sent. Wait for its delivery state to resolve before deleting this call.",
        );
      }

      await tx
        .update(dispatchNotificationOutboxTable)
        .set({
          status: "cancelled",
          failureReason: "Cancelled because the service call was deleted.",
          updatedAt: now,
        })
        .where(
          and(
            eq(dispatchNotificationOutboxTable.callId, callId),
            eq(dispatchNotificationOutboxTable.status, "queued"),
          ),
        );
      const [activeBroadcast] = await tx
        .select({ id: dispatchNotificationOutboxTable.id })
        .from(dispatchNotificationOutboxTable)
        .where(
          and(
            eq(dispatchNotificationOutboxTable.callId, callId),
            eq(dispatchNotificationOutboxTable.status, "processing"),
          ),
        )
        .limit(1);
      if (activeBroadcast) {
        throw new CallDeletionConflictError(
          "The technician broadcast is still being prepared. Wait for it to finish before deleting this call.",
        );
      }

    const threads = await tx
      .select({ id: conversationThreadsTable.id })
      .from(conversationThreadsTable)
      .where(eq(conversationThreadsTable.contactId, callId));
    const threadIds = threads.map((thread) => thread.id);

    if (threadIds.length > 0) {
      await tx
        .delete(conversationMessagesTable)
        .where(inArray(conversationMessagesTable.threadId, threadIds));
    }
    await tx.delete(conversationThreadsTable).where(eq(conversationThreadsTable.contactId, callId));
    await tx.delete(trackingSessionsTable).where(eq(trackingSessionsTable.contactId, callId));
    await tx.delete(technicianNotificationsTable).where(eq(technicianNotificationsTable.callId, callId));
    await tx.delete(dispatchNotificationOutboxTable).where(eq(dispatchNotificationOutboxTable.callId, callId));
    await tx.delete(customerPhoneSharingEventsTable).where(eq(customerPhoneSharingEventsTable.contactId, callId));
    await tx
      .update(phoneIntakesTable)
      .set({ serviceCallId: null, updatedAt: new Date() })
      .where(eq(phoneIntakesTable.serviceCallId, callId));
    await tx
      .update(receiptsTable)
      .set({ serviceCallId: null, updatedAt: new Date() })
      .where(eq(receiptsTable.serviceCallId, callId));

    const [deleted] = await tx
      .delete(contactsTable)
      .where(
        and(
          eq(contactsTable.id, callId),
          inArray(contactsTable.status, ["new", "cancelled"]),
        ),
      )
      .returning({ id: contactsTable.id });
    if (!deleted) {
      throw new CallDeletionConflictError(
        "The service call changed while it was being deleted. Refresh it and try again.",
      );
    }
    });
  } catch (error) {
    if (error instanceof CallDeletionConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }

  req.log.info({ callId, deletedBy: technician.id }, "Service call deleted");
  res.sendStatus(204);
});

router.post("/calls/intake/extract", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const parsed = ExtractCallIntakeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A call summary is required", details: parsed.error.issues });
    return;
  }

  try {
    const extraction = await extractServiceCallIntake(parsed.data.summary);
    req.log.info({ summaryLength: parsed.data.summary.length }, "Service call intake extracted");
    res.json(ExtractCallIntakeResponse.parse(extraction));
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown intake extraction error" },
      "Service call intake extraction failed",
    );
    res.status(502).json({ error: "We could not extract that call summary. You can still enter the call manually." });
  }
});

router.patch("/calls/:id/assign", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  const parsed = assignCallSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid assignment", details: parsed.error?.issues });
    return;
  }

  let result: { updatedId: number | null; reason: "call" | "technician" | "lane" | null };
  try {
    result = await db.transaction(async (tx) => {
      const [call] = await tx
        .select({ id: contactsTable.id, dispatchLane: contactsTable.dispatchLane })
        .from(contactsTable)
        .where(eq(contactsTable.id, id))
        .limit(1);
      if (!call) return { updatedId: null, reason: "call" as const };

      const [assignedTechnician] = await tx
        .select()
        .from(techniciansTable)
        .where(and(
          eq(techniciansTable.id, parsed.data.technicianId),
          eq(techniciansTable.active, true),
          eq(techniciansTable.role, "technician"),
        ))
        .limit(1);
      if (!assignedTechnician) return { updatedId: null, reason: "technician" as const };
      if (assignedTechnician.dispatchLane !== call.dispatchLane) {
        return { updatedId: null, reason: "lane" as const };
      }

      const [updated] = await tx
        .update(contactsTable)
        .set({
          assignedTechnicianId: assignedTechnician.id,
          status: "assigned",
          assignedAt: new Date(),
          phoneSharedWithTechnicianAt: null,
          phoneSharedWithTechnicianBy: null,
        })
        .where(eq(contactsTable.id, id))
        .returning();
      return { updatedId: updated?.id ?? null, reason: null };
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (isDispatchWriteConflict(error)) {
      res.status(409).json({ error: "Dispatch routing changed at the same time. Refresh and try again." });
      return;
    }
    throw error;
  }
  if (result.reason === "call" || !result.updatedId) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  if (result.reason === "technician") {
    res.status(404).json({ error: "Active technician not found" });
    return;
  }
  if (result.reason === "lane") {
    res.status(409).json({
      error: "This technician is assigned to a different dispatch lane than this call.",
    });
    return;
  }
  res.json((await fetchCalls(technician)).find((call) => call.id === id));
});

router.patch("/calls/:id/claim", async (req, res): Promise<void> => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  if (isAdmin(technician)) {
    res.status(403).json({ error: "Active technician access required." });
    return;
  }

  const params = ClaimServiceCallParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid customer call." });
    return;
  }

  let claimedId: number | null;
  try {
    claimedId = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(contactsTable)
        .set({
          assignedTechnicianId: technician.id,
          status: "assigned",
          assignedAt: new Date(),
          phoneSharedWithTechnicianAt: null,
          phoneSharedWithTechnicianBy: null,
        })
        .where(and(
          eq(contactsTable.id, params.data.id),
          eq(contactsTable.status, "new"),
          isNull(contactsTable.assignedTechnicianId),
        ))
        .returning({ id: contactsTable.id });
      return claimed?.id ?? null;
    }, { isolationLevel: "serializable" });
  } catch (error) {
    if (isDispatchWriteConflict(error)) {
      res.status(409).json({ error: "This job was claimed by another technician. Refresh available jobs." });
      return;
    }
    throw error;
  }

  if (!claimedId) {
    const [existing] = await db
      .select({ id: contactsTable.id })
      .from(contactsTable)
      .where(eq(contactsTable.id, params.data.id))
      .limit(1);
    res.status(existing ? 409 : 404).json({
      error: existing
        ? "This job is no longer available. Another technician may have accepted it."
        : "Customer call not found.",
    });
    return;
  }

  const claimedCall = (await fetchCalls(technician)).find((call) => call.id === claimedId);
  if (!claimedCall) {
    req.log.error({ callId: claimedId, technicianId: technician.id }, "Claimed service call could not be loaded");
    res.status(500).json({ error: "The job was accepted but could not be loaded." });
    return;
  }

  req.log.info({ callId: claimedId, technicianId: technician.id }, "Technician claimed open service call");
  res.json(ClaimServiceCallResponse.parse(claimedCall));
});

router.get("/calls/:id/notifications", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid service call." });
    return;
  }

  const [call] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(eq(contactsTable.id, id))
    .limit(1);
  if (!call) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }

  const broadcast = await listCallNotificationDeliveries(id);
  res.json(ListCallNotificationDeliveriesResponse.parse({
    callId: id,
    broadcastStatus: broadcast.broadcastStatus,
    broadcastFailureReason: broadcast.broadcastFailureReason,
    deliveries: broadcast.deliveries.map(serializeNotificationDelivery),
  }));
});

router.post("/calls/:id/notifications/:notificationId/retry", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const params = RetryCallNotificationParams.safeParse(req.params);
  const body = RetryCallNotificationBody.safeParse(req.body);
  if (!params.success || !body.success || params.data.notificationId !== body.data.notificationId) {
    res.status(400).json({ error: "Invalid notification retry request." });
    return;
  }

  const reset = await retryCallNotification(params.data.id, params.data.notificationId);
  if (!reset) {
    res.status(409).json({ error: "Only a failed SMS notification can be retried." });
    return;
  }
  res.status(202).json(RetryCallNotificationResponse.parse({
    id: reset.id,
    callId: reset.callId,
    technicianId: reset.technicianId,
    channel: reset.channel,
    deliveryStatus: reset.deliveryStatus,
  }));
});

router.patch("/calls/:id/status", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  const parsed = callStatusSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid status update", details: parsed.error?.issues });
    return;
  }

  const [existingCall] = await db.select().from(contactsTable).where(eq(contactsTable.id, id)).limit(1);
  if (!existingCall) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  if (!isAdmin(technician) && existingCall.assignedTechnicianId !== technician.id) {
    res.status(403).json({ error: "You can only update calls assigned to you" });
    return;
  }
  if (!isAdmin(technician) && !["in_progress", "completed"].includes(parsed.data.status)) {
    res.status(403).json({ error: "Technicians can only start or complete assigned calls" });
    return;
  }

  const statusUpdatedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(contactsTable)
      .set({
        status: parsed.data.status,
        completedAt: parsed.data.status === "completed" ? statusUpdatedAt : existingCall.completedAt,
      })
      .where(eq(contactsTable.id, id));
    if (parsed.data.status === "cancelled") {
      await tx
        .update(trackingSessionsTable)
        .set({ revokedAt: statusUpdatedAt, sharingStoppedAt: statusUpdatedAt })
        .where(
          and(
            eq(trackingSessionsTable.contactId, id),
            sql`${trackingSessionsTable.revokedAt} IS NULL`,
          ),
        );
    }
  });
  res.json((await fetchCalls(technician)).find((call) => call.id === id));
});

router.patch("/calls/:id/pay", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  const parsed = paySchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid pay amount", details: parsed.error?.issues });
    return;
  }

  const [updated] = await db
    .update(contactsTable)
    .set({ payCents: parsed.data.payCents, paySetAt: new Date() })
    .where(eq(contactsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  res.json((await fetchCalls(technician)).find((call) => call.id === id));
});

router.patch("/calls/:id/phone-sharing", async (req, res) => {
  const technician = await requireOwner(req, res);
  if (!technician) return;
  const params = UpdateServiceCallPhoneSharingParams.safeParse(req.params);
  const body = UpdateServiceCallPhoneSharingBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid customer phone sharing request." });
    return;
  }

  const [call] = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, params.data.id))
    .limit(1);
  if (!call) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  if (body.data.shared && !call.assignedTechnicianId) {
    res.status(400).json({ error: "Assign a technician before revealing the customer phone number." });
    return;
  }

  const now = new Date();
  const expectedAssignee = call.assignedTechnicianId;
  const updated = await db.transaction(async (tx) => {
    const [changedCall] = await tx
      .update(contactsTable)
      .set({
        phoneSharedWithTechnicianAt: body.data.shared ? now : null,
        phoneSharedWithTechnicianBy: body.data.shared ? technician.clerkUserId : null,
      })
      .where(
        and(
          eq(contactsTable.id, call.id),
          expectedAssignee === null
            ? isNull(contactsTable.assignedTechnicianId)
            : eq(contactsTable.assignedTechnicianId, expectedAssignee),
        ),
      )
      .returning();
    if (!changedCall) return null;

    await tx.insert(customerPhoneSharingEventsTable).values({
      contactId: call.id,
      technicianId: expectedAssignee,
      action: body.data.shared ? "revealed" : "hidden",
      approvedBy: technician.clerkUserId,
      createdAt: now,
    });
    return changedCall;
  });
  if (!updated) {
    res.status(409).json({ error: "The technician assignment changed. Refresh this call before changing phone access." });
    return;
  }

  req.log.info(
    { callId: call.id, shared: body.data.shared, approvedBy: technician.clerkUserId },
    "Customer phone sharing state updated",
  );
  const serialized = (await fetchCalls(technician)).find((item) => item.id === call.id);
  if (!serialized) {
    res.status(500).json({ error: "Customer call was updated but could not be loaded" });
    return;
  }
  res.json(UpdateServiceCallPhoneSharingResponse.parse(serialized));
});

router.patch("/calls/:id/deposit", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  const parsed = depositSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid deposit record", details: parsed.error?.issues });
    return;
  }

  const [updated] = await db
    .update(contactsTable)
    .set({
      depositStatus: "manually_verified",
      depositMethod: parsed.data.method,
      depositAmountCents: parsed.data.amountCents,
      depositReceivedAt: new Date(),
      depositReference: parsed.data.reference ?? null,
      depositConfirmedBy: technician.clerkUserId,
    })
    .where(eq(contactsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  req.log.info({ callId: id, method: parsed.data.method }, "Outside deposit manually verified");
  res.json((await fetchCalls(technician)).find((call) => call.id === id));
});

router.post("/calls/:id/tracking-link", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  const parsed = trackingLinkSchema.safeParse(req.body ?? {});
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid tracking link request", details: parsed.error?.issues });
    return;
  }

  const [call] = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, id))
    .limit(1);
  if (!call) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  if (!call.assignedTechnicianId) {
    res.status(400).json({ error: "Assign a technician before creating a tracking link" });
    return;
  }
  if (!["assigned", "in_progress"].includes(call.status)) {
    res.status(400).json({ error: "Tracking links are only available for active assigned calls" });
    return;
  }
  if (!isDepositConfirmed(call.depositStatus)) {
    res.status(400).json({ error: "Confirm the service deposit before creating a tracking link" });
    return;
  }
  if (parsed.data.sendSms) {
    const smsStatus = await getTwilioSmsStatus();
    if (!smsStatus.configured) {
      res.status(400).json({ error: smsStatus.statusText });
      return;
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + parsed.data.expiresInHours * 60 * 60 * 1000);
  const rawToken = randomBytes(32).toString("base64url");
  const [session] = await db.transaction(async (tx) => {
    await tx
      .update(trackingSessionsTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(trackingSessionsTable.contactId, id),
          sql`${trackingSessionsTable.revokedAt} IS NULL`,
        ),
      );
    return tx
      .insert(trackingSessionsTable)
      .values({
        contactId: id,
        tokenHash: hashTrackingToken(rawToken),
        expiresAt,
        createdBy: technician.clerkUserId,
      })
      .returning();
  });

  let origin: string;
  try {
    origin = trackingOrigin();
  } catch (error) {
    await db
      .update(trackingSessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(trackingSessionsTable.id, session.id));
    req.log.error({ err: error, callId: id }, "Tracking link public origin is not configured");
    res.status(503).json({ error: "Tracking link delivery is not configured for this environment" });
    return;
  }
  const url = `${origin}/track/${rawToken}`;
  let smsSent = false;
  if (parsed.data.sendSms) {
    try {
      smsSent = await sendTrackingLinkSms(call.phone, url, expiresAt);
    } catch (error) {
      await db
        .update(trackingSessionsTable)
        .set({ revokedAt: new Date() })
        .where(eq(trackingSessionsTable.id, session.id));
      req.log.error({ err: error, callId: id }, "Tracking link SMS delivery failed");
      res.status(502).json({ error: "Tracking link created but SMS delivery failed; no link was left active" });
      return;
    }
  }

  req.log.info({ callId: id, expiresAt, smsSent }, "Customer tracking link created");
  res.status(201).json({
    callId: id,
    url,
    expiresAt: expiresAt.toISOString(),
    smsSent,
  });
});

router.delete("/calls/:id/tracking-link", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid call id" });
    return;
  }

  const result = await db
    .update(trackingSessionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(trackingSessionsTable.contactId, id),
        sql`${trackingSessionsTable.revokedAt} IS NULL`,
      ),
    )
    .returning({ id: trackingSessionsTable.id });
  if (result.length === 0) {
    res.status(404).json({ error: "Active tracking link not found" });
    return;
  }
  req.log.info({ callId: id }, "Customer tracking link revoked");
  res.json({ revoked: true });
});

router.patch("/calls/:id/tracking-sharing", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  const parsed = trackingSharingSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid tracking sharing update", details: parsed.error?.issues });
    return;
  }

  const [call] = await db.select().from(contactsTable).where(eq(contactsTable.id, id)).limit(1);
  if (!call) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  if (call.assignedTechnicianId !== technician.id) {
    res.status(403).json({ error: "You can only share location for calls assigned to you" });
    return;
  }

  const [session] = await db
    .select()
    .from(trackingSessionsTable)
    .where(
      and(
        eq(trackingSessionsTable.contactId, id),
        sql`${trackingSessionsTable.revokedAt} IS NULL`,
      ),
    )
    .orderBy(desc(trackingSessionsTable.createdAt))
    .limit(1);
  if (!session || session.expiresAt <= new Date()) {
    res.status(400).json({ error: "Create an active customer tracking link first" });
    return;
  }
  if (parsed.data.sharing && ["completed", "cancelled"].includes(call.status)) {
    res.status(400).json({ error: "Location sharing cannot start for a closed call" });
    return;
  }

  const [updated] = await db
    .update(trackingSessionsTable)
    .set({
      sharingStartedAt: parsed.data.sharing ? session.sharingStartedAt ?? new Date() : session.sharingStartedAt,
      sharingStoppedAt: parsed.data.sharing ? null : new Date(),
      etaMinutes: parsed.data.etaMinutes === undefined ? session.etaMinutes : parsed.data.etaMinutes,
    })
    .where(eq(trackingSessionsTable.id, session.id))
    .returning();
  res.json(serializeTrackingSharing(updated));
});

router.patch("/calls/:id/tracking-location", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const id = Number(req.params.id);
  const parsed = trackingLocationSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid tracking location", details: parsed.error?.issues });
    return;
  }

  const [call] = await db.select().from(contactsTable).where(eq(contactsTable.id, id)).limit(1);
  if (!call) {
    res.status(404).json({ error: "Customer call not found" });
    return;
  }
  if (call.assignedTechnicianId !== technician.id) {
    res.status(403).json({ error: "You can only update location for calls assigned to you" });
    return;
  }
  const [session] = await db
    .select()
    .from(trackingSessionsTable)
    .where(
      and(
        eq(trackingSessionsTable.contactId, id),
        sql`${trackingSessionsTable.revokedAt} IS NULL`,
      ),
    )
    .orderBy(desc(trackingSessionsTable.createdAt))
    .limit(1);
  if (!session || session.expiresAt <= new Date() || !isSharing(session)) {
    res.status(400).json({ error: "Start location sharing before sending a location update" });
    return;
  }

  const [updated] = await db
    .update(trackingSessionsTable)
    .set({
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      accuracyMeters: parsed.data.accuracyMeters ?? null,
      locationUpdatedAt: new Date(),
      etaMinutes: parsed.data.etaMinutes === undefined ? session.etaMinutes : parsed.data.etaMinutes,
    })
    .where(eq(trackingSessionsTable.id, session.id))
    .returning();
  res.json(serializeTrackingSharing(updated));
});

router.get("/tracking/sms-status", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  res.json(await getTwilioSmsStatus());
});

router.get("/receipts/public/:token", async (req, res): Promise<void> => {
  const params = GetPublicReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Receipt link not found or expired." });
    return;
  }

  const [receipt] = await db
    .select()
    .from(receiptsTable)
    .where(eq(receiptsTable.accessTokenHash, hashTrackingToken(params.data.token)))
    .limit(1);

  if (!receipt || !receipt.accessTokenExpiresAt || receipt.accessTokenExpiresAt <= new Date()) {
    res.status(404).json({ error: "Receipt link not found or expired." });
    return;
  }

  res.json(GetPublicReceiptResponse.parse({
    receiptNumber: receipt.receiptNumber,
    customerName: receipt.customerName,
    customerAddress: receipt.customerAddress,
    vehicleYear: receipt.vehicleYear,
    vehicleMake: receipt.vehicleMake,
    vehicleModel: receipt.vehicleModel,
    receiptDate: receipt.receiptDate,
    serviceDescription: receipt.serviceDescription,
    amountPaidCents: receipt.amountPaidCents,
    paymentMethod: receipt.paymentMethod,
    notes: receipt.notes,
    expiresAt: receipt.accessTokenExpiresAt,
  }));
});

router.get("/tracking/:token/conversation", async (req, res): Promise<void> => {
  const params = GetPublicTrackingConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Tracking link not found" });
    return;
  }
  const result = await resolvePublicTracking(params.data.token);
  if (!result) {
    res.status(404).json({ error: "Tracking link not found or expired" });
    return;
  }
  res.json(GetPublicTrackingConversationResponse.parse(await getConversation(result.callId, "customer")));
});

router.post("/tracking/:token/conversation/messages", async (req, res): Promise<void> => {
  const params = SendPublicTrackingMessageParams.safeParse(req.params);
  const body = SendPublicTrackingMessageBody.safeParse(req.body);
  if (!params.success) {
    res.status(404).json({ error: "Tracking link not found" });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: "Enter a message between 1 and 2000 characters." });
    return;
  }
  const result = await resolvePublicTracking(params.data.token);
  if (!result) {
    res.status(404).json({ error: "Tracking link not found or expired" });
    return;
  }
  if (["completed", "cancelled"].includes(result.status)) {
    res.status(400).json({ error: "Messages cannot be sent for a closed call." });
    return;
  }

  const conversation = await sendConversationMessage({
    contactId: result.callId,
    viewer: "customer",
    senderRole: "customer",
    body: body.data.body.trim(),
  });
  req.log.info({ callId: result.callId }, "Customer tracking message sent");
  res.status(201).json(SendPublicTrackingMessageResponse.parse(conversation));
});

router.get("/tracking/:token", async (req, res) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  if (!token) {
    res.status(404).json({ error: "Tracking link not found" });
    return;
  }
  const result = await resolvePublicTracking(token);
  if (!result) {
    res.status(404).json({ error: "Tracking link not found or expired" });
    return;
  }

  const sessionSharing = isSharing(result.session);
  const status = result.status === "completed"
    ? "completed"
    : result.status === "cancelled"
      ? "cancelled"
      : result.status === "in_progress" || sessionSharing
        ? "on_the_way"
        : "scheduled";
  const sharing = sessionSharing && status === "on_the_way";
  res.json({
    status,
    statusLabel: {
      scheduled: "Technician assigned",
      on_the_way: "Technician is on the way",
      completed: "Service complete",
      cancelled: "Call cancelled",
    }[status],
    sharing,
    hasLiveLocation: sharing &&
      result.session.latitude !== null &&
      result.session.longitude !== null,
    etaMinutes: sharing ? result.session.etaMinutes : null,
    expiresAt: result.session.expiresAt.toISOString(),
  });
});

router.get("/contracts", async (req, res) => {
  const technician = await requireTechnician(req, res);
  if (!technician) return;
  const contracts = await db
    .select({
      id: contractsTable.id,
      technicianId: contractsTable.technicianId,
      technicianName: techniciansTable.name,
      title: contractsTable.title,
      status: contractsTable.status,
      perCallCents: contractsTable.perCallCents,
      hourlyRateCents: contractsTable.hourlyRateCents,
      startDate: contractsTable.startDate,
      endDate: contractsTable.endDate,
      notes: contractsTable.notes,
      createdAt: contractsTable.createdAt,
    })
    .from(contractsTable)
    .leftJoin(techniciansTable, eq(contractsTable.technicianId, techniciansTable.id))
    .where(isAdmin(technician) ? undefined : eq(contractsTable.technicianId, technician.id))
    .orderBy(desc(contractsTable.createdAt));
  res.json(contracts.map((contract) => ({ ...contract, createdAt: contract.createdAt.toISOString() })));
});

router.post("/contracts", async (req, res) => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const parsed = contractInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid contract", details: parsed.error.issues });
    return;
  }
  const [assignee] = await db.select().from(techniciansTable).where(eq(techniciansTable.id, parsed.data.technicianId)).limit(1);
  if (!assignee) {
    res.status(404).json({ error: "Technician not found" });
    return;
  }
  const [created] = await db.insert(contractsTable).values(parsed.data).returning();
  res.status(201).json({ ...created, technicianName: assignee.name, createdAt: created.createdAt.toISOString() });
});

export default router;