import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runApplicationMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS phone_intakes (
      id serial PRIMARY KEY,
      provider text NOT NULL DEFAULT 'twilio',
      provider_call_id text NOT NULL,
      caller_number text NOT NULL,
      business_number text,
      direction text NOT NULL DEFAULT 'inbound',
      received_at timestamp NOT NULL DEFAULT now(),
      ended_at timestamp,
      duration_seconds integer,
      consent_state text NOT NULL DEFAULT 'notice_played',
      recording_status text NOT NULL DEFAULT 'awaiting_recording',
      recording_url text,
      recording_provider_id text,
      recording_retention_expires_at timestamp,
      transcript_status text NOT NULL DEFAULT 'pending',
      transcript text,
      transcripted_at timestamp,
      draft_status text NOT NULL DEFAULT 'waiting_for_recording',
      draft jsonb,
      failure_reason text,
      reviewed_by text,
      reviewed_at timestamp,
      service_call_id integer,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
    ALTER TABLE phone_intakes ADD COLUMN IF NOT EXISTS recording_provider_id text;
    CREATE UNIQUE INDEX IF NOT EXISTS phone_intakes_provider_call_id_idx ON phone_intakes (provider_call_id);

    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pay_set_at timestamp;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_shared_with_technician_at timestamp;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_shared_with_technician_by text;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dispatch_lane text NOT NULL DEFAULT 'general';
    ALTER TABLE technicians ADD COLUMN IF NOT EXISTS dispatch_lane text NOT NULL DEFAULT 'general';
    ALTER TABLE technicians ADD COLUMN IF NOT EXISTS base_address text;
    ALTER TABLE technicians ADD COLUMN IF NOT EXISTS service_area text;
    ALTER TABLE technicians ADD COLUMN IF NOT EXISTS tools text;
    ALTER TABLE technicians ADD COLUMN IF NOT EXISTS limitations text;
    ALTER TABLE technicians ADD COLUMN IF NOT EXISTS bio text;

    CREATE TABLE IF NOT EXISTS customer_phone_sharing_events (
      id serial PRIMARY KEY,
      contact_id integer NOT NULL REFERENCES contacts(id),
      technician_id integer,
      action text NOT NULL,
      approved_by text,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS customer_phone_sharing_events_contact_id_idx
      ON customer_phone_sharing_events (contact_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS technician_notifications (
      id serial PRIMARY KEY,
      call_id integer NOT NULL REFERENCES contacts(id),
      technician_id integer NOT NULL REFERENCES technicians(id),
      channel text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      delivery_status text NOT NULL DEFAULT 'pending',
      provider_message_id text,
      failure_reason text,
      sent_at timestamp,
      read_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS technician_notifications_call_technician_channel_idx
      ON technician_notifications (call_id, technician_id, channel);
    CREATE INDEX IF NOT EXISTS technician_notifications_technician_unread_idx
      ON technician_notifications (technician_id, channel, read_at, created_at DESC);
    CREATE INDEX IF NOT EXISTS technician_notifications_pending_delivery_idx
      ON technician_notifications (delivery_status, channel, updated_at);

    CREATE TABLE IF NOT EXISTS dispatch_notification_outbox (
      id serial PRIMARY KEY,
      call_id integer NOT NULL REFERENCES contacts(id),
      status text NOT NULL DEFAULT 'queued',
      failure_reason text,
      processed_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
    ALTER TABLE dispatch_notification_outbox ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued';
    ALTER TABLE dispatch_notification_outbox ADD COLUMN IF NOT EXISTS failure_reason text;
    UPDATE dispatch_notification_outbox
      SET status = 'complete'
      WHERE processed_at IS NOT NULL AND status = 'queued';
    CREATE UNIQUE INDEX IF NOT EXISTS dispatch_notification_outbox_call_idx
      ON dispatch_notification_outbox (call_id);
    CREATE INDEX IF NOT EXISTS dispatch_notification_outbox_pending_idx
      ON dispatch_notification_outbox (processed_at, created_at);
    CREATE INDEX IF NOT EXISTS dispatch_notification_outbox_status_idx
      ON dispatch_notification_outbox (status, created_at);

    CREATE TABLE IF NOT EXISTS receipts (
      id serial PRIMARY KEY,
      receipt_number text NOT NULL,
      service_call_id integer REFERENCES contacts(id),
      customer_name text NOT NULL,
      customer_phone text NOT NULL,
      customer_address text,
      vehicle_year text,
      vehicle_make text,
      vehicle_model text,
      receipt_date date NOT NULL,
      service_description text NOT NULL,
      amount_paid_cents integer NOT NULL,
      payment_method text NOT NULL,
      notes text,
      access_token_hash text,
      access_token_expires_at timestamp,
      delivery_status text NOT NULL DEFAULT 'not_sent',
      provider_message_id text,
      delivery_failure_reason text,
      sent_at timestamp,
      send_started_at timestamp,
      created_by text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS receipts_receipt_number_idx ON receipts (receipt_number);
    CREATE UNIQUE INDEX IF NOT EXISTS receipts_access_token_hash_idx ON receipts (access_token_hash);
    CREATE INDEX IF NOT EXISTS receipts_service_call_id_idx ON receipts (service_call_id);
    CREATE INDEX IF NOT EXISTS receipts_delivery_status_idx ON receipts (delivery_status, updated_at);

    CREATE TABLE IF NOT EXISTS receipt_signatures (
      id serial PRIMARY KEY,
      receipt_id integer NOT NULL REFERENCES receipts(id),
      document_version text NOT NULL,
      receipt_snapshot jsonb NOT NULL,
      policy_snapshot jsonb NOT NULL,
      payment_verification_status text NOT NULL,
      signer_name text NOT NULL,
      signature_strokes jsonb NOT NULL,
      electronic_consent boolean NOT NULL,
      policy_acknowledged boolean NOT NULL,
      signed_at timestamp NOT NULL DEFAULT now(),
      signed_by text NOT NULL,
      document_hash text NOT NULL,
      voided_at timestamp,
      voided_by text,
      void_reason text,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS receipt_signatures_receipt_id_idx
      ON receipt_signatures (receipt_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS receipt_signatures_active_receipt_idx
      ON receipt_signatures (receipt_id)
      WHERE voided_at IS NULL;
  `);
  logger.info("Application database migrations complete");
}