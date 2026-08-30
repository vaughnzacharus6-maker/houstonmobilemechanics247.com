import { and, eq, isNull, lt, sql } from "drizzle-orm";
import {
  contactsTable,
  db,
  dispatchNotificationOutboxTable,
  technicianNotificationsTable,
  techniciansTable,
  type Contact,
} from "@workspace/db";
import { logger } from "./logger";
import {
  SmsConfirmedFailureError,
  SmsOutcomeUnknownError,
  sendTwilioSms,
} from "./twilio-sms";

const NOTIFICATION_CHANNELS = {
  inApp: "in_app",
  sms: "sms",
} as const;

const DELIVERY_STATUS = {
  pending: "pending",
  sending: "sending",
  sent: "sent",
  failed: "failed",
  unknown: "unknown",
} as const;

const BROADCAST_STATUS = {
  queued: "queued",
  processing: "processing",
  complete: "complete",
  needsAttention: "needs_attention",
} as const;

function publicPortalOrigin() {
  const configuredOrigin = process.env.PUBLIC_APP_ORIGIN;
  if (configuredOrigin) {
    const parsed = new URL(configuredOrigin);
    if (parsed.protocol !== "https:") {
      throw new Error("PUBLIC_APP_ORIGIN must use HTTPS");
    }
    return parsed.origin;
  }

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim()
    ?? process.env.REPLIT_DEV_DOMAIN?.trim();
  if (!domain) throw new Error("A public HTTPS origin is required for dispatch links");
  return `https://${domain}`;
}

function formatUrgency(urgency: string) {
  return urgency.replaceAll("_", " ");
}

function notificationContent(call: Contact) {
  const title = "New dispatch available";
  const body = [
    `Houston Mobile Mechanic: new ${formatUrgency(call.urgency)} dispatch.`,
    `Sign in to review: ${publicPortalOrigin()}/portal`,
  ].join(" ");
  return { title, body };
}

export function isDispatchNotificationRecipient(technician: Pick<typeof techniciansTable.$inferSelect, "role">) {
  return technician.role === "owner" || technician.role === "technician";
}

async function claimPendingSms(id: number) {
  const [claimed] = await db
    .update(technicianNotificationsTable)
    .set({
      deliveryStatus: DELIVERY_STATUS.sending,
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(technicianNotificationsTable.id, id),
        eq(technicianNotificationsTable.channel, NOTIFICATION_CHANNELS.sms),
        eq(technicianNotificationsTable.deliveryStatus, DELIVERY_STATUS.pending),
      ),
    )
    .returning();
  return claimed ?? null;
}

async function deliverSmsNotification(notification: typeof technicianNotificationsTable.$inferSelect) {
  const claimed = await claimPendingSms(notification.id);
  if (!claimed) return;

  const [technician] = await db
    .select({ phone: techniciansTable.phone })
    .from(techniciansTable)
    .where(eq(techniciansTable.id, claimed.technicianId))
    .limit(1);

  if (!technician?.phone?.trim()) {
    await db
      .update(technicianNotificationsTable)
      .set({
        deliveryStatus: DELIVERY_STATUS.failed,
        failureReason: "Technician has no mobile number.",
        updatedAt: new Date(),
      })
      .where(eq(technicianNotificationsTable.id, claimed.id));
    return;
  }

  let providerMessageId: string | null;
  try {
    providerMessageId = await sendTwilioSms(technician.phone, claimed.body);
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Unknown SMS delivery failure.";
    await db
      .update(technicianNotificationsTable)
      .set({
        deliveryStatus: error instanceof SmsOutcomeUnknownError
          ? DELIVERY_STATUS.unknown
          : DELIVERY_STATUS.failed,
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(technicianNotificationsTable.id, claimed.id));
    logger.warn(
      { err: error, notificationId: claimed.id, callId: claimed.callId, technicianId: claimed.technicianId },
      "Twilio dispatch SMS failed",
    );
    return;
  }

  try {
    await db
      .update(technicianNotificationsTable)
      .set({
        deliveryStatus: DELIVERY_STATUS.sent,
        providerMessageId,
        sentAt: new Date(),
        failureReason: null,
        updatedAt: new Date(),
      })
      .where(eq(technicianNotificationsTable.id, claimed.id));
    logger.info(
      { notificationId: claimed.id, callId: claimed.callId, technicianId: claimed.technicianId },
      "Twilio dispatch SMS sent",
    );
  } catch (error) {
    logger.error(
      { err: error, notificationId: claimed.id, callId: claimed.callId, technicianId: claimed.technicianId },
      "SMS provider accepted dispatch alert but delivery record could not be confirmed",
    );
    throw error;
  }
}

async function recoverStalledSmsNotifications() {
  const staleBefore = new Date(Date.now() - 2 * 60_000);
  await db
    .update(technicianNotificationsTable)
    .set({
      deliveryStatus: DELIVERY_STATUS.unknown,
      failureReason: "Delivery attempt did not finish. Verify with the technician before re-sending.",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(technicianNotificationsTable.channel, NOTIFICATION_CHANNELS.sms),
        eq(technicianNotificationsTable.deliveryStatus, DELIVERY_STATUS.sending),
        lt(technicianNotificationsTable.updatedAt, staleBefore),
      ),
    );
}

async function recoverStalledDispatchNotificationBroadcasts() {
  const staleBefore = new Date(Date.now() - 2 * 60_000);
  await db
    .update(dispatchNotificationOutboxTable)
    .set({
      status: BROADCAST_STATUS.needsAttention,
      failureReason: "Broadcast preparation did not finish. Review the dispatch before re-sending alerts.",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dispatchNotificationOutboxTable.status, BROADCAST_STATUS.processing),
        lt(dispatchNotificationOutboxTable.updatedAt, staleBefore),
      ),
    );
}

async function createDispatchNotificationRows(callId: number) {
  const [call] = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.id, callId))
    .limit(1);
  if (!call) throw new Error("Service call no longer exists.");

  const recipients = await db
    .select()
    .from(techniciansTable)
    .where(eq(techniciansTable.active, true));
  const technicians = recipients.filter(isDispatchNotificationRecipient);
  if (technicians.length === 0) return;

  const { title, body } = notificationContent(call);
  const rows = technicians.flatMap((technician) => [
    {
      callId,
      technicianId: technician.id,
      channel: NOTIFICATION_CHANNELS.inApp,
      title,
      body,
      deliveryStatus: DELIVERY_STATUS.sent,
      sentAt: new Date(),
    },
    ...(technician.phone?.trim()
      ? [{
          callId,
          technicianId: technician.id,
          channel: NOTIFICATION_CHANNELS.sms,
          title,
          body,
          deliveryStatus: DELIVERY_STATUS.pending,
        }]
      : []),
  ]);

  await db
    .insert(technicianNotificationsTable)
    .values(rows)
    .onConflictDoNothing({
      target: [
        technicianNotificationsTable.callId,
        technicianNotificationsTable.technicianId,
        technicianNotificationsTable.channel,
      ],
    });
}

export async function enqueueDispatchNotifications(callId: number) {
  await db
    .insert(dispatchNotificationOutboxTable)
    .values({ callId })
    .onConflictDoNothing({ target: dispatchNotificationOutboxTable.callId });
}

async function processDispatchNotificationOutbox() {
  const queued = await db
    .select()
    .from(dispatchNotificationOutboxTable)
    .where(eq(dispatchNotificationOutboxTable.status, BROADCAST_STATUS.queued))
    .orderBy(dispatchNotificationOutboxTable.createdAt)
    .limit(50);

  await Promise.all(queued.map(async (entry) => {
    const [claimed] = await db
      .update(dispatchNotificationOutboxTable)
      .set({
        status: BROADCAST_STATUS.processing,
        failureReason: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dispatchNotificationOutboxTable.id, entry.id),
          eq(dispatchNotificationOutboxTable.status, BROADCAST_STATUS.queued),
        ),
      )
      .returning();
    if (!claimed) return;

    try {
      await createDispatchNotificationRows(entry.callId);
      await db
        .update(dispatchNotificationOutboxTable)
        .set({
          status: BROADCAST_STATUS.complete,
          processedAt: new Date(),
          failureReason: null,
          updatedAt: new Date(),
        })
        .where(eq(dispatchNotificationOutboxTable.id, entry.id));
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : "Unknown broadcast preparation failure.";
      await db
        .update(dispatchNotificationOutboxTable)
        .set({
          status: BROADCAST_STATUS.needsAttention,
          failureReason,
          updatedAt: new Date(),
        })
        .where(eq(dispatchNotificationOutboxTable.id, entry.id));
      logger.error({ err: error, callId: entry.callId }, "Dispatch notification queue processing failed");
    }
  }));
}

export async function processPendingTechnicianNotifications() {
  await recoverStalledSmsNotifications();
  await recoverStalledDispatchNotificationBroadcasts();
  await processDispatchNotificationOutbox();
  const pending = await db
    .select()
    .from(technicianNotificationsTable)
    .where(
      and(
        eq(technicianNotificationsTable.channel, NOTIFICATION_CHANNELS.sms),
        eq(technicianNotificationsTable.deliveryStatus, DELIVERY_STATUS.pending),
      ),
    )
    .orderBy(technicianNotificationsTable.createdAt)
    .limit(50);

  await Promise.all(pending.map(deliverSmsNotification));
}

export function startTechnicianNotificationWorker() {
  void processPendingTechnicianNotifications().catch((error) => {
    logger.error({ err: error }, "Initial technician notification delivery failed");
  });
  setInterval(() => {
    void processPendingTechnicianNotifications().catch((error) => {
      logger.error({ err: error }, "Scheduled technician notification delivery failed");
    });
  }, 15_000).unref();
}

export async function queueDispatchNotifications(callId: number) {
  try {
    await enqueueDispatchNotifications(callId);
    void processPendingTechnicianNotifications().catch((error) => {
      logger.error({ err: error, callId }, "Dispatch notification delivery failed");
    });
  } catch (error) {
    logger.error({ err: error, callId }, "Dispatch notification queueing failed");
  }
}

export async function listTechnicianNotifications(technicianId: number) {
  return db
    .select()
    .from(technicianNotificationsTable)
    .where(
      and(
        eq(technicianNotificationsTable.technicianId, technicianId),
        eq(technicianNotificationsTable.channel, NOTIFICATION_CHANNELS.inApp),
      ),
    )
    .orderBy(sql`${technicianNotificationsTable.createdAt} DESC`)
    .limit(50);
}

export async function unreadTechnicianNotificationCount(technicianId: number) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(technicianNotificationsTable)
    .where(
      and(
        eq(technicianNotificationsTable.technicianId, technicianId),
        eq(technicianNotificationsTable.channel, NOTIFICATION_CHANNELS.inApp),
        isNull(technicianNotificationsTable.readAt),
      ),
    );
  return count;
}

export async function markTechnicianNotificationRead(id: number, technicianId: number) {
  const [updated] = await db
    .update(technicianNotificationsTable)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(technicianNotificationsTable.id, id),
        eq(technicianNotificationsTable.technicianId, technicianId),
        eq(technicianNotificationsTable.channel, NOTIFICATION_CHANNELS.inApp),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function listCallNotificationDeliveries(callId: number) {
  const [outbox, deliveries] = await Promise.all([
    db
      .select({
        status: dispatchNotificationOutboxTable.status,
        failureReason: dispatchNotificationOutboxTable.failureReason,
      })
      .from(dispatchNotificationOutboxTable)
      .where(eq(dispatchNotificationOutboxTable.callId, callId))
      .limit(1),
    db
      .select({
        id: technicianNotificationsTable.id,
        technicianId: technicianNotificationsTable.technicianId,
        technicianName: techniciansTable.name,
        channel: technicianNotificationsTable.channel,
        deliveryStatus: technicianNotificationsTable.deliveryStatus,
        providerMessageId: technicianNotificationsTable.providerMessageId,
        failureReason: technicianNotificationsTable.failureReason,
        sentAt: technicianNotificationsTable.sentAt,
        createdAt: technicianNotificationsTable.createdAt,
      })
      .from(technicianNotificationsTable)
      .innerJoin(techniciansTable, eq(technicianNotificationsTable.technicianId, techniciansTable.id))
      .where(eq(technicianNotificationsTable.callId, callId))
      .orderBy(techniciansTable.name, technicianNotificationsTable.channel),
  ]);

  const broadcast = outbox[0];
  return {
    broadcastStatus: broadcast?.status ?? BROADCAST_STATUS.complete,
    broadcastFailureReason: broadcast?.failureReason ?? null,
    deliveries,
  };
}

export async function retryCallNotification(callId: number, notificationId: number) {
  const [reset] = await db
    .update(technicianNotificationsTable)
    .set({
      deliveryStatus: DELIVERY_STATUS.pending,
      providerMessageId: null,
      failureReason: null,
      sentAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(technicianNotificationsTable.id, notificationId),
        eq(technicianNotificationsTable.callId, callId),
        eq(technicianNotificationsTable.channel, NOTIFICATION_CHANNELS.sms),
        eq(technicianNotificationsTable.deliveryStatus, DELIVERY_STATUS.failed),
      ),
    )
    .returning();
  if (!reset) return null;
  void processPendingTechnicianNotifications().catch((error) => {
    logger.error({ err: error, callId, notificationId }, "Retried dispatch notification delivery failed");
  });
  return reset;
}