import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  serviceType: text("service_type").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  description: text("description").notNull(),
  urgency: text("urgency").notNull().default("routine"),
  notes: text("notes"),
  location: text("location"),
  dispatchLane: text("dispatch_lane").notNull().default("general"),
  status: text("status").notNull().default("new"),
  assignedTechnicianId: integer("assigned_technician_id"),
  payCents: integer("pay_cents").notNull().default(0),
  paySetAt: timestamp("pay_set_at"),
  phoneSharedWithTechnicianAt: timestamp("phone_shared_with_technician_at"),
  phoneSharedWithTechnicianBy: text("phone_shared_with_technician_by"),
  depositStatus: text("deposit_status").notNull().default("pending"),
  depositMethod: text("deposit_method"),
  depositAmountCents: integer("deposit_amount_cents").notNull().default(5000),
  depositReceivedAt: timestamp("deposit_received_at"),
  depositReference: text("deposit_reference"),
  depositConfirmedBy: text("deposit_confirmed_by"),
  scheduledAt: timestamp("scheduled_at"),
  assignedAt: timestamp("assigned_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerPhoneSharingEventsTable = pgTable("customer_phone_sharing_events", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id),
  technicianId: integer("technician_id"),
  action: text("action").notNull(),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
