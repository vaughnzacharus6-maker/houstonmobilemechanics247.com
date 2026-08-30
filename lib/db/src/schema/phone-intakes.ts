import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type PhoneIntakeDraft = {
  name: string | null;
  phone: string | null;
  email: string | null;
  serviceType: string | null;
  vehicleType: string | null;
  description: string | null;
  urgency: "routine" | "soon" | "urgent" | null;
  notes: string | null;
  location: string | null;
  missingFields: string[];
  uncertainFields: string[];
};

export const phoneIntakesTable = pgTable(
  "phone_intakes",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull().default("twilio"),
    providerCallId: text("provider_call_id").notNull(),
    callerNumber: text("caller_number").notNull(),
    businessNumber: text("business_number"),
    direction: text("direction").notNull().default("inbound"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    durationSeconds: integer("duration_seconds"),
    consentState: text("consent_state").notNull().default("notice_played"),
    recordingStatus: text("recording_status").notNull().default("awaiting_recording"),
    recordingUrl: text("recording_url"),
    recordingProviderId: text("recording_provider_id"),
    recordingRetentionExpiresAt: timestamp("recording_retention_expires_at"),
    transcriptStatus: text("transcript_status").notNull().default("pending"),
    transcript: text("transcript"),
    transcriptedAt: timestamp("transcripted_at"),
    draftStatus: text("draft_status").notNull().default("waiting_for_recording"),
    draft: jsonb("draft").$type<PhoneIntakeDraft>(),
    failureReason: text("failure_reason"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    serviceCallId: integer("service_call_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("phone_intakes_provider_call_id_idx").on(table.providerCallId)],
);

export type PhoneIntake = typeof phoneIntakesTable.$inferSelect;