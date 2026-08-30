import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { contactsTable } from "./contacts";

export const dispatchNotificationOutboxTable = pgTable(
  "dispatch_notification_outbox",
  {
    id: serial("id").primaryKey(),
    callId: integer("call_id").notNull().references(() => contactsTable.id),
    status: text("status").notNull().default("queued"),
    failureReason: text("failure_reason"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    callUnique: uniqueIndex("dispatch_notification_outbox_call_idx").on(table.callId),
    pendingIndex: index("dispatch_notification_outbox_pending_idx").on(table.processedAt, table.createdAt),
  }),
);