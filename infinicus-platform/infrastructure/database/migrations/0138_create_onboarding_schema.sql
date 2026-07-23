-- Migration: 0138_create_onboarding_schema
-- BUILD-19 — Onboarding schema: tenant onboarding progress tracking
-- Tables: tenant_onboarding
--
-- Tenant/workspace/business/membership creation itself uses the frozen
-- tenancy/platform/identity tables from migrations 0003/0004/0005 — this
-- migration adds only the progress-tracking table that lets a multi-step
-- onboarding flow be resumed/retried across separate requests.

BEGIN;

CREATE SCHEMA IF NOT EXISTS onboarding;

-- ── onboarding.tenant_onboarding ─────────────────────────────────────────────
-- One row per onboarding attempt (one tenant per attempt). workspace_id is
-- NOT NULL because the first onboarding step creates the tenant and its
-- initial workspace atomically; business_id/membership_id are filled in by
-- later steps and are nullable until then.

CREATE TABLE onboarding.tenant_onboarding (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL UNIQUE REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id    uuid        NOT NULL REFERENCES tenancy.workspaces(id)         ON DELETE RESTRICT,
  business_id     uuid        REFERENCES platform.businesses(id)                ON DELETE RESTRICT,
  membership_id   uuid        REFERENCES tenancy.memberships(id)                ON DELETE RESTRICT,
  initiated_by    uuid        NOT NULL REFERENCES identity.users(id)            ON DELETE RESTRICT,
  status          text        NOT NULL DEFAULT 'in_progress',
  current_step    text        NOT NULL DEFAULT 'workspace_created',
  completed_steps jsonb       NOT NULL DEFAULT '[]',
  correlation_id  uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  abandoned_at    timestamptz,
  CONSTRAINT tenant_onboarding_status_check CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  CONSTRAINT tenant_onboarding_step_check CHECK (current_step IN (
    'workspace_created', 'business_created', 'owner_assigned',
    'settings_applied', 'invitations_sent', 'completed'
  ))
);

COMMENT ON TABLE onboarding.tenant_onboarding IS
  'Tracks progress through the tenant onboarding wizard so a partially completed signup can be resumed or retried.';

INSERT INTO _migrations (filename) VALUES ('0138_create_onboarding_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
