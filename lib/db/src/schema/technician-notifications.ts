import { integer, pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { contactsTable } from "./contacts";
import { techniciansTable } from "./technicians";

export const technicianNotificationsTable = pgTable(
  "technician_notifications",
  {
    id: serial("id").primaryKey(),
    callId: integer("call_id").notNull().references(() => contactsTable.id),
    technicianId: integer("technician_id").notNull().references(() => techniciansTable.id),
    channel: text("channel").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    deliveryStatus: text("delivery_status").notNull().default("pending"),
    providerMessageId: text("provider_message_id"),
    failureReason: text("failure_reason"),
    sentAt: timestamp("sent_at"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    callTechnicianChannelUnique: uniqueIndex("technician_notifications_call_technician_channel_idx")
      .on(table.callId, table.technicianId, table.channel),
    technicianUnreadIndex: index("technician_notifications_technician_unread_idx")
      .on(table.technicianId, table.channel, table.readAt, table.createdAt),
    pendingDeliveryIndex: index("technician_notifications_pending_delivery_idx")
      .on(table.deliveryStatus, table.channel, table.updatedAt),
  }),
);

export type TechnicianNotification = typeof technicianNotificationsTable.$inferSelect;