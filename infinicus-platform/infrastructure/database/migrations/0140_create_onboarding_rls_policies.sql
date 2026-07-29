-- Migration: 0140_create_onboarding_rls_policies
-- BUILD-19 — RLS for onboarding.tenant_onboarding
--
-- Standard tenant isolation would be insufficient here: a user resuming an
-- onboarding attempt after losing local state (e.g. a new browser session)
-- needs to find their in-progress row before full tenant context can be
-- established client-side. The policy therefore admits a row if EITHER the
-- caller's tenant matches OR the caller is the user who initiated it —
-- mirroring the same OR-predicate pattern already used by
-- tenancy.roles_isolation (system roles) and audit.access_events_isolation
-- (tenant-less events) in migration 0011.

BEGIN;

ALTER TABLE onboarding.tenant_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding.tenant_onboarding FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_onboarding_isolation ON onboarding.tenant_onboarding
  USING (
    tenant_id    = current_setting('app.tenant_id', true)::uuid
    OR initiated_by = current_setting('app.user_id', true)::uuid
  );

INSERT INTO _migrations (filename) VALUES ('0140_create_onboarding_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
