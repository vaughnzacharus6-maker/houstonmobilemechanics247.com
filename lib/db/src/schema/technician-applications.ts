import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const technicianApplicationsTable = pgTable("technician_applications", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  serviceArea: text("service_area").notNull(),
  experience: text("experience").notNull(),
  specialties: text("specialties").notNull(),
  availability: text("availability").notNull(),
  introduction: text("introduction"),
  status: text("status").notNull().default("new"),
  ownerNotes: text("owner_notes"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTechnicianApplicationSchema = createInsertSchema(technicianApplicationsTable).omit({
  id: true,
  status: true,
  ownerNotes: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTechnicianApplication = z.infer<typeof insertTechnicianApplicationSchema>;
export type TechnicianApplication = typeof technicianApplicationsTable.$inferSelect;