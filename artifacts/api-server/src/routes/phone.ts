import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import {
  ApprovePhoneIntakeBody,
  ApprovePhoneIntakeParams,
  ApprovePhoneIntakeResponse,
  GetPhoneIntakeStatusResponse,
  ListPhoneIntakesResponse,
  ProcessPhoneIntakeRecordingParams,
  ProcessPhoneIntakeRecordingResponse,
} from "@workspace/api-zod";
import {
  contactsTable,
  db,
  dispatchNotificationOutboxTable,
  phoneIntakesTable,
  techniciansTable,
  type PhoneIntake,
  type PhoneIntakeDraft,
} from "@workspace/db";
import { ensureCompatibleFormat, speechToText } from "@workspace/integrations-openai-ai-server/audio";
import { logger } from "../lib/logger";
import { extractServiceCallIntake } from "../lib/service-call-intake";
import { queueDispatchNotifications } from "../lib/technician-notifications";

export const phoneWebhookRouter = Router();
const router = Router();

const MAX_RECORDING_BYTES = 25 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 30;

function retentionDays() {
  const configured = Number(process.env.PHONE_RECORDING_RETENTION_DAYS);
  return Number.isInteger(configured) && configured >= 1 && configured <= 365
    ? configured
    : DEFAULT_RETENTION_DAYS;
}

function publicOrigin() {
  const configuredOrigin = process.env.PUBLIC_APP_ORIGIN;
  if (configuredOrigin) {
    const parsed = new URL(configuredOrigin);
    if (parsed.protocol !== "https:") throw new Error("PUBLIC_APP_ORIGIN must use HTTPS");
    return parsed.origin;
  }

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim()
    ?? process.env.REPLIT_DEV_DOMAIN?.trim();
  if (!domain) throw new Error("A public HTTPS origin is required for phone webhooks");
  return `https://${domain}`;
}

function xmlEscape(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function normalizePhone(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function rawWebhookPayload(req: Request): Record<string, string> | null {
  const body = req.body;
  if (!Buffer.isBuffer(body)) return null;

  const text = body.toString("utf8");
  const contentType = req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return Object.fromEntries(
        Object.entries(parsed).flatMap(([key, value]) =>
          typeof value === "string" || typeof value === "number" ? [[key, String(value)]] : [],
        ),
      );
    } catch {
      return null;
    }
  }

  return Object.fromEntries(new URLSearchParams(text).entries());
}

function hasValidTwilioSignature(req: Request, payload: Record<string, string>) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signatureHeader = req.header("x-twilio-signature");
  if (!authToken || !signatureHeader) return false;

  let url: string;
  try {
    url = `${publicOrigin()}${req.originalUrl}`;
  } catch {
    return false;
  }

  const signedPayload = Object.entries(payload)
    .sort(([left], [right]) => left.localeCompare(right))
    .reduce((value, [key, item]) => `${value}${key}${item}`, url);
  const expected = createHmac("sha1", authToken).update(signedPayload).digest("base64");
  const received = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

function twimlResponse(actionUrl: string) {
  const escapedAction = xmlEscape(actionUrl);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This call may be recorded and transcribed to help Houston Mobile Mechanic prepare your service request. By continuing after this notice, you consent to recording and transcription. If you do not consent, please hang up and use our website contact form.</Say>
  <Record action="${escapedAction}" method="POST" maxLength="1800" playBeep="true" trim="trim-silence" />
  <Say voice="alice">We did not receive a recording. Goodbye.</Say>
</Response>`;
}

async function deleteProviderRecording(intake: PhoneIntake) {
  if (!intake.recordingProviderId || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio recording deletion credentials are unavailable.");
  }
  const auth = Buffer
    .from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`)
    .toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(process.env.TWILIO_ACCOUNT_SID)}/Recordings/${encodeURIComponent(intake.recordingProviderId)}.json`,
    { method: "DELETE", headers: { authorization: `Basic ${auth}` } },
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`Twilio recording deletion returned ${response.status}.`);
  }
}

async function expirePhoneRecordings() {
  const now = new Date();
  const expiredIntakes = await db
    .select()
    .from(phoneIntakesTable)
    .where(
      and(
        lte(phoneIntakesTable.recordingRetentionExpiresAt, now),
        isNotNull(phoneIntakesTable.recordingProviderId),
        inArray(phoneIntakesTable.recordingStatus, ["available", "processing", "failed", "retention_failed"]),
      ),
    );

  for (const intake of expiredIntakes) {
    try {
      await deleteProviderRecording(intake);
      await db
        .update(phoneIntakesTable)
        .set({
          recordingStatus: "expired",
          recordingUrl: null,
          recordingProviderId: null,
          updatedAt: now,
        })
        .where(eq(phoneIntakesTable.id, intake.id));
      logger.info({ intakeId: intake.id }, "Expired phone recording deleted from provider");
    } catch (error) {
      await db
        .update(phoneIntakesTable)
        .set({
          recordingStatus: "retention_failed",
          recordingUrl: null,
          failureReason: "The app could not confirm provider-side recording deletion after the retention period.",
          updatedAt: now,
        })
        .where(eq(phoneIntakesTable.id, intake.id));
      logger.error({ err: error, intakeId: intake.id }, "Phone recording retention cleanup failed");
    }
  }
}

void expirePhoneRecordings().catch((error) => {
  logger.error({ err: error }, "Initial phone recording retention cleanup failed");
});
setInterval(() => {
  void expirePhoneRecordings().catch((error) => {
    logger.error({ err: error }, "Scheduled phone recording retention cleanup failed");
  });
}, 60 * 60 * 1000).unref();

function serializePhoneIntake(intake: PhoneIntake) {
  return {
    id: intake.id,
    provider: intake.provider,
    providerCallId: intake.providerCallId,
    callerNumber: intake.callerNumber,
    businessNumber: intake.businessNumber,
    direction: intake.direction,
    receivedAt: intake.receivedAt.toISOString(),
    endedAt: intake.endedAt?.toISOString() ?? null,
    durationSeconds: intake.durationSeconds,
    consentState: intake.consentState,
    recordingStatus: intake.recordingStatus,
    recordingRetentionExpiresAt: intake.recordingRetentionExpiresAt?.toISOString() ?? null,
    transcriptStatus: intake.transcriptStatus,
    transcript: intake.transcript,
    transcriptedAt: intake.transcriptedAt?.toISOString() ?? null,
    draftStatus: intake.draftStatus,
    draft: intake.draft ?? null,
    failureReason: intake.failureReason,
    reviewedAt: intake.reviewedAt?.toISOString() ?? null,
    serviceCallId: intake.serviceCallId,
    createdAt: intake.createdAt.toISOString(),
    updatedAt: intake.updatedAt.toISOString(),
  };
}

async function requirePhoneAdmin(req: Request, res: Response) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const [technician] = await db
    .select()
    .from(techniciansTable)
    .where(eq(techniciansTable.clerkUserId, auth.userId))
    .limit(1);
  if (!technician || !technician.active || !["owner", "admin"].includes(technician.role)) {
    res.status(403).json({ error: "Owner or admin access required" });
    return null;
  }
  return technician;
}

async function updateProcessingFailure(intakeId: number, message: string) {
  await db
    .update(phoneIntakesTable)
    .set({
      recordingStatus: "failed",
      transcriptStatus: "failed",
      draftStatus: "failed",
      failureReason: message,
      updatedAt: new Date(),
    })
    .where(eq(phoneIntakesTable.id, intakeId));
}

async function transcribeAndExtract(intake: PhoneIntake) {
  if (!intake.recordingUrl) throw new Error("No recording is available for this call.");
  if (
    intake.recordingRetentionExpiresAt !== null
    && intake.recordingRetentionExpiresAt <= new Date()
  ) {
    throw new Error("The recording retention period has ended.");
  }

  const headers: Record<string, string> = {};
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    headers.authorization = `Basic ${Buffer
      .from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`)
      .toString("base64")}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const recordingUrl = /\.[a-z0-9]{2,4}($|\?)/i.test(intake.recordingUrl)
      ? intake.recordingUrl
      : `${intake.recordingUrl}.mp3`;
    const response = await fetch(recordingUrl, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`Recording provider returned ${response.status}.`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_RECORDING_BYTES) throw new Error("The recording is too large to transcribe.");
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length === 0) throw new Error("The recording is empty.");
    if (audio.length > MAX_RECORDING_BYTES) throw new Error("The recording is too large to transcribe.");

    const compatibleAudio = await ensureCompatibleFormat(audio);
    const transcript = (await speechToText(compatibleAudio.buffer, compatibleAudio.format)).trim();
    if (!transcript) throw new Error("The transcription service returned no text.");
    const extraction = await extractServiceCallIntake(transcript.slice(0, 20_000));
    const uncertainFields = [...new Set([
      ...extraction.uncertainFields,
      ...(transcript.length > 20_000 ? ["details after the first 20,000 transcript characters"] : []),
    ])];
    const draft: PhoneIntakeDraft = {
      ...extraction,
      phone: extraction.phone ?? intake.callerNumber,
      uncertainFields,
    };

    const [updated] = await db
      .update(phoneIntakesTable)
      .set({
        recordingStatus: "available",
        transcriptStatus: "ready",
        transcript,
        transcriptedAt: new Date(),
        draftStatus: "ready_for_review",
        draft,
        failureReason: null,
        updatedAt: new Date(),
      })
      .where(eq(phoneIntakesTable.id, intake.id))
      .returning();
    return updated;
  } finally {
    clearTimeout(timer);
  }
}

phoneWebhookRouter.post("/incoming", async (req, res): Promise<void> => {
  const payload = rawWebhookPayload(req);
  if (!payload || !hasValidTwilioSignature(req, payload)) {
    req.log.warn("Rejected unsigned or malformed phone webhook");
    res.status(401).type("text/plain").send("Unauthorized");
    return;
  }

  const providerCallId = payload.CallSid ?? payload.callSid;
  const callerNumber = payload.From ?? payload.from;
  const businessNumber = payload.To ?? payload.to;
  if (!providerCallId || !callerNumber || !businessNumber) {
    req.log.warn("Rejected phone webhook without caller metadata");
    res.status(400).type("text/plain").send("Missing call metadata");
    return;
  }
  const configuredNumber = process.env.PHONE_BUSINESS_NUMBER;
  if (!configuredNumber) {
    req.log.error({ providerCallId }, "Phone webhook rejected because no business number is configured");
    res.status(503).type("text/plain").send("Phone intake is not configured");
    return;
  }
  if (normalizePhone(configuredNumber) !== normalizePhone(businessNumber)) {
    req.log.warn({ providerCallId }, "Rejected phone webhook for an unexpected business number");
    res.status(403).type("text/plain").send("Unexpected business number");
    return;
  }

  const [existing] = await db
    .select()
    .from(phoneIntakesTable)
    .where(eq(phoneIntakesTable.providerCallId, providerCallId))
    .limit(1);
  if (!existing) {
    await db.insert(phoneIntakesTable).values({
      provider: "twilio",
      providerCallId,
      callerNumber,
      businessNumber,
      consentState: "notice_played",
      recordingStatus: "awaiting_recording",
      transcriptStatus: "pending",
      draftStatus: "waiting_for_recording",
    });
    req.log.info({ providerCallId }, "Inbound phone intake received");
  }

  let actionUrl: string;
  try {
    actionUrl = `${publicOrigin()}/api/phone/webhooks/recording`;
  } catch (error) {
    req.log.error({ err: error, providerCallId }, "Phone webhook public origin is not configured");
    res.status(503).type("text/plain").send("Phone intake is not configured");
    return;
  }
  res.type("text/xml").send(twimlResponse(actionUrl));
});

phoneWebhookRouter.post("/recording", async (req, res): Promise<void> => {
  const payload = rawWebhookPayload(req);
  if (!payload || !hasValidTwilioSignature(req, payload)) {
    req.log.warn("Rejected unsigned or malformed recording webhook");
    res.status(401).type("text/plain").send("Unauthorized");
    return;
  }

  const providerCallId = payload.CallSid ?? payload.callSid;
  const recordingUrl = payload.RecordingUrl ?? payload.recordingUrl;
  const recordingProviderId = payload.RecordingSid ?? payload.recordingSid;
  if (!providerCallId || !recordingUrl || !recordingUrl.startsWith("https://") || !recordingProviderId) {
    req.log.warn({ providerCallId }, "Recording callback did not contain a usable recording URL");
    res.status(400).type("text/plain").send("Missing recording metadata");
    return;
  }
  const duration = Number(payload.RecordingDuration ?? payload.recordingDuration);
  const [updated] = await db
    .update(phoneIntakesTable)
    .set({
      endedAt: new Date(),
      durationSeconds: Number.isInteger(duration) && duration >= 0 ? duration : null,
      consentState: "recording_received",
      recordingStatus: "available",
      recordingUrl,
      recordingProviderId,
      recordingRetentionExpiresAt: new Date(Date.now() + retentionDays() * 24 * 60 * 60 * 1000),
      transcriptStatus: "pending",
      draftStatus: "awaiting_transcription",
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(phoneIntakesTable.providerCallId, providerCallId))
    .returning();
  if (!updated) {
    req.log.warn({ providerCallId }, "Recording callback did not match an inbound phone intake");
    res.status(404).type("text/plain").send("Unknown call");
    return;
  }

  req.log.info({ providerCallId, intakeId: updated.id }, "Phone recording received");
  res.type("text/xml").send('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thank you. A dispatcher will review your request.</Say></Response>');
});

router.get("/phone/intakes/status", async (req, res): Promise<void> => {
  const technician = await requirePhoneAdmin(req, res);
  if (!technician) return;
  res.json(GetPhoneIntakeStatusResponse.parse({
    configured: Boolean(process.env.PHONE_BUSINESS_NUMBER && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    provider: "twilio",
    businessNumber: process.env.PHONE_BUSINESS_NUMBER ?? null,
    retentionDays: retentionDays(),
    recordingAccess: "owner_admin_only",
  }));
});

router.get("/phone/intakes", async (req, res): Promise<void> => {
  const technician = await requirePhoneAdmin(req, res);
  if (!technician) return;
  await expirePhoneRecordings();
  const intakes = await db
    .select()
    .from(phoneIntakesTable)
    .orderBy(desc(phoneIntakesTable.createdAt))
    .limit(100);
  res.json(ListPhoneIntakesResponse.parse(intakes.map(serializePhoneIntake)));
});

router.post("/phone/intakes/:id/process", async (req, res): Promise<void> => {
  const technician = await requirePhoneAdmin(req, res);
  if (!technician) return;
  const params = ProcessPhoneIntakeRecordingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid phone intake" });
    return;
  }
  await expirePhoneRecordings();
  const [intake] = await db
    .select()
    .from(phoneIntakesTable)
    .where(eq(phoneIntakesTable.id, params.data.id))
    .limit(1);
  if (!intake) {
    res.status(404).json({ error: "Phone intake not found" });
    return;
  }
  if (!intake.recordingUrl) {
    res.status(400).json({ error: "No consented recording is available for this call." });
    return;
  }
  if (intake.recordingStatus === "processing" || intake.transcriptStatus === "processing") {
    res.status(409).json({ error: "This call is already being transcribed." });
    return;
  }

  await db
    .update(phoneIntakesTable)
    .set({
      recordingStatus: "processing",
      transcriptStatus: "processing",
      draftStatus: "processing",
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(phoneIntakesTable.id, intake.id));
  try {
    const updated = await transcribeAndExtract(intake);
    req.log.info({ intakeId: intake.id }, "Phone intake transcribed and extracted");
    res.json(ProcessPhoneIntakeRecordingResponse.parse(serializePhoneIntake(updated)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not transcribe this recording.";
    await updateProcessingFailure(intake.id, message);
    req.log.warn({ intakeId: intake.id, error: message }, "Phone intake transcription failed");
    res.status(502).json({ error: "The recording could not be transcribed. The failure is saved for dispatcher review." });
  }
});

router.post("/phone/intakes/:id/approve", async (req, res): Promise<void> => {
  const technician = await requirePhoneAdmin(req, res);
  if (!technician) return;
  const params = ApprovePhoneIntakeParams.safeParse(req.params);
  const body = ApprovePhoneIntakeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Complete the required service-call details before approval." });
    return;
  }
  const [intake] = await db
    .select()
    .from(phoneIntakesTable)
    .where(eq(phoneIntakesTable.id, params.data.id))
    .limit(1);
  if (!intake) {
    res.status(404).json({ error: "Phone intake not found" });
    return;
  }
  if (intake.draftStatus === "approved") {
    res.status(409).json({ error: "This phone intake has already been approved." });
    return;
  }
  if (intake.draftStatus !== "ready_for_review") {
    res.status(400).json({ error: "Transcribe the consented recording before approving this intake." });
    return;
  }

  const data = body.data;
  const updated = await db.transaction(async (tx) => {
    const [locked] = await tx
      .update(phoneIntakesTable)
      .set({ draftStatus: "approving", updatedAt: new Date() })
      .where(
        and(
          eq(phoneIntakesTable.id, intake.id),
          eq(phoneIntakesTable.draftStatus, "ready_for_review"),
        ),
      )
      .returning();
    if (!locked) return null;
    const [serviceCall] = await tx
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
    await tx.insert(dispatchNotificationOutboxTable).values({ callId: serviceCall.id });
    const [approved] = await tx
      .update(phoneIntakesTable)
      .set({
        draftStatus: "approved",
        draft: {
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email?.trim() || null,
          serviceType: data.serviceType.trim(),
          vehicleType: data.vehicleType.trim(),
          description: data.description.trim(),
          urgency: data.urgency ?? "routine",
          notes: data.notes?.trim() || null,
          location: data.location?.trim() || null,
          missingFields: [],
          uncertainFields: [],
        },
        reviewedBy: technician.clerkUserId,
        reviewedAt: new Date(),
        serviceCallId: serviceCall.id,
        updatedAt: new Date(),
      })
      .where(eq(phoneIntakesTable.id, intake.id))
      .returning();
    return approved;
  });
  if (!updated) {
    res.status(409).json({ error: "Another dispatcher is already reviewing this intake." });
    return;
  }

  req.log.info({ intakeId: intake.id, serviceCallId: updated.serviceCallId }, "Phone intake approved into service call");
  if (updated.serviceCallId) {
    void queueDispatchNotifications(updated.serviceCallId);
  }
  res.json(ApprovePhoneIntakeResponse.parse(serializePhoneIntake(updated)));
});

export default router;