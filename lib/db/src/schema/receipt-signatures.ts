import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { receiptsTable } from "./receipts";

export const receiptSignaturesTable = pgTable(
  "receipt_signatures",
  {
    id: serial("id").primaryKey(),
    receiptId: integer("receipt_id").notNull().references(() => receiptsTable.id),
    documentVersion: text("document_version").notNull(),
    receiptSnapshot: jsonb("receipt_snapshot").$type<{
      receiptNumber: string;
      customerName: string;
      customerAddress: string | null;
      vehicleYear: string | null;
      vehicleMake: string | null;
      vehicleModel: string | null;
      receiptDate: string;
      serviceDescription: string;
      amountPaidCents: number;
      paymentMethod: string;
      paymentStatusLabel: string;
    }>().notNull(),
    policySnapshot: jsonb("policy_snapshot").$type<{
      version: string;
      title: string;
      acknowledgments: string[];
    }>().notNull(),
    paymentVerificationStatus: text("payment_verification_status").notNull(),
    signerName: text("signer_name").notNull(),
    signatureStrokes: jsonb("signature_strokes").$type<Array<{
      points: Array<{ x: number; y: number }>;
    }>>().notNull(),
    electronicConsent: boolean("electronic_consent").notNull(),
    policyAcknowledged: boolean("policy_acknowledged").notNull(),
    signedAt: timestamp("signed_at").notNull().defaultNow(),
    signedBy: text("signed_by").notNull(),
    documentHash: text("document_hash").notNull(),
    voidedAt: timestamp("voided_at"),
    voidedBy: text("voided_by"),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("receipt_signatures_active_receipt_idx")
      .on(table.receiptId)
      .where(sql`${table.voidedAt} IS NULL`),
    index("receipt_signatures_receipt_id_idx").on(table.receiptId, table.createdAt),
  ],
);

export const insertReceiptSignatureSchema = createInsertSchema(receiptSignaturesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReceiptSignature = z.infer<typeof insertReceiptSignatureSchema>;
export type ReceiptSignature = typeof receiptSignaturesTable.$inferSelect;
