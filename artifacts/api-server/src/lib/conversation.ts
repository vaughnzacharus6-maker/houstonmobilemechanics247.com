import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import {
  conversationMessagesTable,
  conversationThreadsTable,
  db,
  techniciansTable,
} from "@workspace/db";

type Viewer = "customer" | "staff";
type SenderRole = "customer" | "technician" | "admin";

export async function ensureConversationThread(contactId: number) {
  const [existing] = await db
    .select()
    .from(conversationThreadsTable)
    .where(eq(conversationThreadsTable.contactId, contactId))
    .limit(1);
  if (existing) return existing;

  try {
    const [created] = await db
      .insert(conversationThreadsTable)
      .values({ contactId })
      .returning();
    return created;
  } catch {
    const [thread] = await db
      .select()
      .from(conversationThreadsTable)
      .where(eq(conversationThreadsTable.contactId, contactId))
      .limit(1);
    if (!thread) throw new Error("Could not create a conversation thread");
    return thread;
  }
}

function senderLabel(senderRole: string) {
  if (senderRole === "customer") return "Customer";
  return senderRole === "admin" ? "Dispatch" : "Your technician";
}

async function markMessagesRead(threadId: number, viewer: Viewer) {
  const senderCondition = viewer === "customer"
    ? inArray(conversationMessagesTable.senderRole, ["technician", "admin"])
    : eq(conversationMessagesTable.senderRole, "customer");

  await db
    .update(conversationMessagesTable)
    .set({ deliveryStatus: "read", readAt: new Date() })
    .where(
      and(
        eq(conversationMessagesTable.threadId, threadId),
        isNull(conversationMessagesTable.readAt),
        senderCondition,
      ),
    );
}

export async function getConversation(contactId: number, viewer: Viewer) {
  const thread = await ensureConversationThread(contactId);
  await markMessagesRead(thread.id, viewer);

  const rows = await db
    .select({
      id: conversationMessagesTable.id,
      threadId: conversationMessagesTable.threadId,
      senderRole: conversationMessagesTable.senderRole,
      body: conversationMessagesTable.body,
      deliveryStatus: conversationMessagesTable.deliveryStatus,
      readAt: conversationMessagesTable.readAt,
      createdAt: conversationMessagesTable.createdAt,
    })
    .from(conversationMessagesTable)
    .leftJoin(
      techniciansTable,
      eq(conversationMessagesTable.authorTechnicianId, techniciansTable.id),
    )
    .where(eq(conversationMessagesTable.threadId, thread.id))
    .orderBy(asc(conversationMessagesTable.createdAt));

  const messages = rows.map((message) => ({
    id: message.id,
    threadId: message.threadId,
    senderRole: message.senderRole as SenderRole,
    senderLabel: senderLabel(message.senderRole),
    body: message.body,
    deliveryStatus: message.deliveryStatus,
    readAt: message.readAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  }));

  const unreadCount = messages.filter(
    (message) =>
      message.readAt === null &&
      (viewer === "customer"
        ? message.senderRole !== "customer"
        : message.senderRole === "customer"),
  ).length;

  return {
    callId: contactId,
    threadId: thread.id,
    messages,
    unreadCount,
  };
}

export async function sendConversationMessage({
  contactId,
  viewer,
  senderRole,
  body,
  authorTechnicianId,
  authorClerkUserId,
}: {
  contactId: number;
  viewer: Viewer;
  senderRole: SenderRole;
  body: string;
  authorTechnicianId?: number;
  authorClerkUserId?: string | null;
}) {
  const thread = await ensureConversationThread(contactId);
  await db.transaction(async (tx) => {
    await tx.insert(conversationMessagesTable).values({
      threadId: thread.id,
      senderRole,
      authorTechnicianId: authorTechnicianId ?? null,
      authorClerkUserId: authorClerkUserId ?? null,
      body,
      deliveryStatus: "sent",
    });
    await tx
      .update(conversationThreadsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationThreadsTable.id, thread.id));
  });

  return getConversation(contactId, viewer);
}