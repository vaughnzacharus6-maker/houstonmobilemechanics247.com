import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const techniciansTable = pgTable("technicians", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  specialty: text("specialty"),
  baseAddress: text("base_address"),
  serviceArea: text("service_area"),
  tools: text("tools"),
  limitations: text("limitations"),
  bio: text("bio"),
  dispatchLane: text("dispatch_lane").notNull().default("general"),
  role: text("role").notNull().default("technician"),
  availability: text("availability").notNull().default("offline"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contractsTable = pgTable("technician_contracts", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"),
  perCallCents: integer("per_call_cents").notNull().default(0),
  hourlyRateCents: integer("hourly_rate_cents").notNull().default(0),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTechnicianSchema = createInsertSchema(techniciansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertContractSchema = createInsertSchema(contractsTable).omit({
  id: true,
  createdAt: true,
});

export type Technician = typeof techniciansTable.$inferSelect;
export type Contract = typeof contractsTable.$inferSelect;
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;