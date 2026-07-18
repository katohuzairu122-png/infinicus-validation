-- Migration: 0006_create_audit_schema
-- Stage 2A — Audit schema: append-only audit trail and access events
-- Tables: audit_events, entity_versions, access_events

BEGIN;

CREATE SCHEMA IF NOT EXISTS audit;

-- ── audit.audit_events ───────────────────────────────────────────────────────
-- Append-only. No UPDATE or DELETE paths for application role.

CREATE TABLE audit.audit_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id   uuid        REFERENCES tenancy.workspaces(id)          ON DELETE RESTRICT,
  business_id    uuid,
  actor_type     text        NOT NULL,
  actor_id       uuid,
  action         text        NOT NULL,
  entity_type    text        NOT NULL,
  entity_id      uuid,
  before_data    jsonb,
  after_data     jsonb,
  metadata       jsonb       NOT NULL DEFAULT '{}',
  correlation_id uuid        NOT NULL,
  ip_address     inet,
  user_agent     text,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_actor_type_check CHECK (
    actor_type IN ('user','service_account','system','integration')
  )
);

-- ── audit.entity_versions ────────────────────────────────────────────────────
-- Append-only point-in-time snapshots per entity version.

CREATE TABLE audit.entity_versions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  workspace_id   uuid,
  business_id    uuid,
  entity_type    text        NOT NULL,
  entity_id      uuid        NOT NULL,
  entity_version integer     NOT NULL,
  snapshot       jsonb       NOT NULL,
  change_type    text        NOT NULL,
  correlation_id uuid        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  CONSTRAINT entity_versions_unique UNIQUE (entity_type, entity_id, entity_version)
);

-- ── audit.access_events ──────────────────────────────────────────────────────
-- Append-only. Tracks authentication, authorisation, and sensitive access.

CREATE TABLE audit.access_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        REFERENCES tenancy.tenants(id)  ON DELETE RESTRICT,
  user_id     uuid        REFERENCES identity.users(id)   ON DELETE SET NULL,
  event_type  text        NOT NULL,
  ip_address  inet,
  user_agent  text,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_events_type_check CHECK (event_type IN (
    'login','logout','failed_auth','permission_denied',
    'sensitive_data_access','api_key_usage','session_revocation'
  ))
);

INSERT INTO _migrations (filename) VALUES ('0006_create_audit_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
