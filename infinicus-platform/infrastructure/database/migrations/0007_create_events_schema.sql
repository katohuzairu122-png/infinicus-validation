-- Migration: 0007_create_events_schema
-- Stage 2A — Events schema: outbox/inbox pattern, dead-letter, subscriptions
-- Tables: outbox_events, inbox_events, dead_letter_events,
--         event_subscriptions, event_delivery_attempts

BEGIN;

CREATE SCHEMA IF NOT EXISTS events;

-- ── events.outbox_events ─────────────────────────────────────────────────────

CREATE TABLE events.outbox_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     text        NOT NULL,
  event_version  text        NOT NULL DEFAULT '1.0',
  tenant_id      uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id   uuid        REFERENCES tenancy.workspaces(id)          ON DELETE RESTRICT,
  business_id    uuid,
  correlation_id uuid        NOT NULL,
  causation_id   uuid,
  aggregate_type text        NOT NULL,
  aggregate_id   uuid        NOT NULL,
  payload        jsonb       NOT NULL DEFAULT '{}',
  headers        jsonb       NOT NULL DEFAULT '{}',
  status         text        NOT NULL DEFAULT 'pending',
  attempt_count  integer     NOT NULL DEFAULT 0,
  available_at   timestamptz NOT NULL DEFAULT now(),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_events_status_check CHECK (
    status IN ('pending','processing','published','failed','dead_lettered')
  )
);

-- ── events.inbox_events ──────────────────────────────────────────────────────
-- Idempotent consumer inbox. event_id + consumer_name is unique.

CREATE TABLE events.inbox_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid        NOT NULL,
  consumer_name  text        NOT NULL,
  event_type     text        NOT NULL,
  tenant_id      uuid        NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  payload        jsonb       NOT NULL DEFAULT '{}',
  status         text        NOT NULL DEFAULT 'received',
  received_at    timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz,
  failed_at      timestamptz,
  failure_reason text,
  CONSTRAINT inbox_events_idempotency UNIQUE (event_id, consumer_name),
  CONSTRAINT inbox_events_status_check CHECK (
    status IN ('received','processing','processed','failed')
  )
);

-- ── events.dead_letter_events ────────────────────────────────────────────────

CREATE TABLE events.dead_letter_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_event  jsonb       NOT NULL,
  failure_reason  text        NOT NULL,
  attempt_count   integer     NOT NULL DEFAULT 0,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at  timestamptz NOT NULL DEFAULT now(),
  replay_status   text        NOT NULL DEFAULT 'pending',
  replayed_at     timestamptz,
  CONSTRAINT dead_letter_replay_check CHECK (replay_status IN ('pending','replayed','abandoned'))
);

-- ── events.event_subscriptions ───────────────────────────────────────────────

CREATE TABLE events.event_subscriptions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_name  text        NOT NULL UNIQUE,
  event_pattern    text        NOT NULL,
  destination_type text        NOT NULL,
  destination_ref  text        NOT NULL,
  status           text        NOT NULL DEFAULT 'active',
  retry_policy     jsonb       NOT NULL DEFAULT '{"maxAttempts":3,"backoffSeconds":30}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_subscriptions_status_check CHECK (status IN ('active','paused','disabled'))
);

-- ── events.event_delivery_attempts ───────────────────────────────────────────
-- Append-only: one row per attempt; never overwrite.

CREATE TABLE events.event_delivery_attempts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_event_id uuid        NOT NULL REFERENCES events.outbox_events(id) ON DELETE CASCADE,
  attempt_number  integer     NOT NULL,
  status          text        NOT NULL,
  response_code   integer,
  response_body   text,
  attempted_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_delivery_attempts_unique UNIQUE (outbox_event_id, attempt_number)
);

INSERT INTO _migrations (filename) VALUES ('0007_create_events_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
