-- Migration: 0147_create_secret_rotation_events
-- BUILD-24 — Secret rotation audit: one append-only row per secret
-- rotation (which secret, which environment, when it expires, who
-- rotated it). Never stores the secret value itself — only rotation
-- metadata for expiration tracking and audit evidence.
--
-- Platform-scoped, not tenant-scoped: a secret rotation is platform
-- infrastructure metadata, the same reasoning already applied to
-- platform.deployment_events (0146), platform.system_settings/
-- feature_flags (0005), and _migrations itself (0001). No RLS is
-- applied for the same reason those tables have none.
--
-- Append-only: a rotation, once recorded, is a permanent historical
-- fact — there is no update path, matching the append-only convention
-- used for evidence/history tables throughout this platform (see
-- forbid_mutation() usage in the domain schemas).

BEGIN;

CREATE TABLE platform.secret_rotation_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name    text        NOT NULL,
  environment    text        NOT NULL,
  rotated_by     text        NOT NULL,
  rotated_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT secret_rotation_events_environment_check CHECK (environment IN ('local','test','staging','production'))
);

CREATE INDEX idx_secret_rotation_events_secret_name_rotated_at
  ON platform.secret_rotation_events (secret_name, environment, rotated_at DESC);

COMMENT ON TABLE platform.secret_rotation_events IS
  'Append-only audit trail of secret rotations: which secret, which environment, when it was rotated, and when it expires. Never stores the secret value itself. Platform-scoped (no tenant_id), matching platform.deployment_events.';

INSERT INTO _migrations (filename) VALUES ('0147_create_secret_rotation_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
