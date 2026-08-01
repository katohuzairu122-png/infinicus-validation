-- Migration: 0167_create_register_sessions_rls
-- Row Level Security for business_operations.register_sessions (0165).
-- Pattern: tenant_id = app.tenant_id AND workspace_id = app.workspace_id
-- (null-safe, fail-closed) — identical to every other business_operations
-- table's policy (see 0035_create_bo_rls_policies.sql,
-- 0163_create_products_rls.sql).

BEGIN;

ALTER TABLE business_operations.register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY register_sessions_isolation ON business_operations.register_sessions
  USING (
    tenant_id        = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

INSERT INTO _migrations (filename) VALUES ('0167_create_register_sessions_rls.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
