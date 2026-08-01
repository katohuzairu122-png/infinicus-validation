-- Migration: 0163_create_products_rls
-- Row Level Security for business_operations.products (0161).
-- Pattern: tenant_id = app.tenant_id AND workspace_id = app.workspace_id
-- (null-safe, fail-closed) — identical to every other business_operations
-- table's policy (see 0035_create_bo_rls_policies.sql,
-- 0160_create_business_events_rls.sql).

BEGIN;

ALTER TABLE business_operations.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_isolation ON business_operations.products
  USING (
    tenant_id        = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

INSERT INTO _migrations (filename) VALUES ('0163_create_products_rls.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
