import { doublePrecision, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trackingSessionsTable = pgTable("tracking_sessions", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdBy: text("created_by"),
  sharingStartedAt: timestamp("sharing_started_at"),
  sharingStoppedAt: timestamp("sharing_stopped_at"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  accuracyMeters: doublePrecision("accuracy_meters"),
  locationUpdatedAt: timestamp("location_updated_at"),
  etaMinutes: integer("eta_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrackingSessionSchema = createInsertSchema(trackingSessionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTrackingSession = z.infer<typeof insertTrackingSessionSchema>;
export type TrackingSession = typeof trackingSessionsTable.$inferSelect;