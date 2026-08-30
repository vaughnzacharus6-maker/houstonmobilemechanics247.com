import { date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";

export const receiptsTable = pgTable(
  "receipts",
  {
    id: serial("id").primaryKey(),
    receiptNumber: text("receipt_number").notNull(),
    serviceCallId: integer("service_call_id").references(() => contactsTable.id),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerAddress: text("customer_address"),
    vehicleYear: text("vehicle_year"),
    vehicleMake: text("vehicle_make"),
    vehicleModel: text("vehicle_model"),
    receiptDate: date("receipt_date", { mode: "string" }).notNull(),
    serviceDescription: text("service_description").notNull(),
    amountPaidCents: integer("amount_paid_cents").notNull(),
    paymentMethod: text("payment_method").notNull(),
    notes: text("notes"),
    accessTokenHash: text("access_token_hash"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    deliveryStatus: text("delivery_status").notNull().default("not_sent"),
    providerMessageId: text("provider_message_id"),
    deliveryFailureReason: text("delivery_failure_reason"),
    sentAt: timestamp("sent_at"),
    sendStartedAt: timestamp("send_started_at"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("receipts_receipt_number_idx").on(table.receiptNumber),
    uniqueIndex("receipts_access_token_hash_idx").on(table.accessTokenHash),
    index("receipts_service_call_id_idx").on(table.serviceCallId),
    index("receipts_delivery_status_idx").on(table.deliveryStatus, table.updatedAt),
  ],
);

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;