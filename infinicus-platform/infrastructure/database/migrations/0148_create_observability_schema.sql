-- Migration: 0148_create_observability_schema
-- BUILD-25 — Error tracking and alerting tables.
--
-- observability.error_events: captured application errors (the
-- persistence side of packages/observability's ErrorTracker). Mirrors
-- audit.access_events' tenant-nullable pattern (0006) — an error can
-- occur before a tenant is known (e.g. a pre-auth request failure).
--
-- observability.alert_events: threshold-crossing operational alerts
-- (e.g. outbox backlog, elevated error rate). Deliberately
-- platform-scoped, not tenant-scoped — an alert is platform operational
-- metadata, the same reasoning already applied to
-- platform.deployment_events (0146) and platform.secret_rotation_events
-- (0147). No RLS is applied for the same reason those tables have none.

BEGIN;

CREATE SCHEMA IF NOT EXISTS observability;

CREATE TABLE observability.error_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        REFERENCES tenancy.tenants(id) ON DELETE SET NULL,
  correlation_id uuid,
  level          text        NOT NULL DEFAULT 'error',
  error_name     text        NOT NULL,
  message        text        NOT NULL,
  route          text,
  status_code    integer,
  context        jsonb       NOT NULL DEFAULT '{}',
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT error_events_level_check CHECK (level IN ('warning', 'error'))
);

CREATE INDEX idx_error_events_occurred_at ON observability.error_events (occurred_at DESC);
CREATE INDEX idx_error_events_tenant_id_occurred_at ON observability.error_events (tenant_id, occurred_at DESC);

ALTER TABLE observability.error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability.error_events FORCE ROW LEVEL SECURITY;

CREATE POLICY error_events_isolation ON observability.error_events
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

CREATE TABLE observability.alert_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_name   text        NOT NULL,
  severity     text        NOT NULL,
  message      text        NOT NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alert_events_severity_check CHECK (severity IN ('warning', 'critical'))
);

CREATE INDEX idx_alert_events_alert_name_triggered_at ON observability.alert_events (alert_name, triggered_at DESC);

COMMENT ON TABLE observability.error_events IS
  'Captured application errors — the persistence side of ErrorTracker. tenant_id nullable (pre-auth errors), RLS admits NULL or the caller''s own tenant, matching audit.access_events.';
COMMENT ON TABLE observability.alert_events IS
  'Threshold-crossing operational alerts (outbox lag, error rate, ...). Platform-scoped (no tenant_id), matching platform.deployment_events/secret_rotation_events.';

INSERT INTO _migrations (filename) VALUES ('0148_create_observability_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
