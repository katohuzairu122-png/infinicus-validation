-- Migration: 0139_create_onboarding_indexes
-- BUILD-19 — Indexes for onboarding.tenant_onboarding
-- tenant_id is already indexed via its UNIQUE constraint.

BEGIN;

CREATE INDEX idx_onboarding_initiated_by ON onboarding.tenant_onboarding (initiated_by, status);
CREATE INDEX idx_onboarding_status       ON onboarding.tenant_onboarding (status);
CREATE INDEX idx_onboarding_workspace    ON onboarding.tenant_onboarding (workspace_id);

INSERT INTO _migrations (filename) VALUES ('0139_create_onboarding_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
