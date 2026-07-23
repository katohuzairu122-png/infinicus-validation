-- Migration: 0144_create_api_rls_policies
-- BUILD-21 — RLS for api.idempotency_keys (standard tenant isolation)

BEGIN;

ALTER TABLE api.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.idempotency_keys FORCE ROW LEVEL SECURITY;

CREATE POLICY idempotency_keys_isolation ON api.idempotency_keys
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0144_create_api_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
