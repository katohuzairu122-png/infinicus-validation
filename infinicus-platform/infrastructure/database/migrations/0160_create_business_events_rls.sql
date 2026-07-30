-- Migration: 0160_create_business_events_rls
-- Row Level Security for business_operations.business_events (0158).
-- Pattern: tenant_id = app.tenant_id AND workspace_id = app.workspace_id
-- (null-safe, fail-closed) — identical to every other business_operations
-- table's policy (see 0035_create_bo_rls_policies.sql).

BEGIN;

ALTER TABLE business_operations.business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_events_isolation ON business_operations.business_events
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

INSERT INTO _migrations (filename) VALUES ('0160_create_business_events_rls.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
