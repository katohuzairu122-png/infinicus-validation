-- Migration: 0146_create_deployment_events
-- BUILD-23 — Deployment audit: one row per deployment attempt (started,
-- then updated to succeeded/failed/rolled_back).
--
-- Deliberately platform-scoped, not tenant-scoped: a deployment is
-- platform infrastructure metadata (which immutable build version was
-- promoted to which environment, when, and by what mechanism), not
-- tenant business data — the same reasoning that already applies to
-- platform.system_settings and platform.feature_flags (0005), and to
-- _migrations itself (0001), neither of which carry tenant_id. No RLS is
-- applied for the same reason those tables have none.

BEGIN;

CREATE TABLE platform.deployment_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version        text        NOT NULL,
  environment    text        NOT NULL,
  git_sha        text        NOT NULL,
  status         text        NOT NULL DEFAULT 'started',
  deployed_by    text,
  notes          text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deployment_events_environment_check CHECK (environment IN ('local','test','staging','production')),
  CONSTRAINT deployment_events_status_check CHECK (status IN ('started','succeeded','failed','rolled_back'))
);

CREATE INDEX idx_deployment_events_environment_started_at
  ON platform.deployment_events (environment, started_at DESC);

CREATE TRIGGER trg_platform_deployment_events_updated_at
  BEFORE UPDATE ON platform.deployment_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE platform.deployment_events IS
  'One row per deployment attempt to a named environment: which immutable build version, from which commit, deployed by what, and its outcome. Platform-scoped (no tenant_id), matching platform.system_settings/feature_flags and _migrations.';

INSERT INTO _migrations (filename) VALUES ('0146_create_deployment_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
