-- Migration: 0143_create_api_indexes
-- BUILD-21 — Indexes for api.idempotency_keys
-- The (tenant_id, idempotency_key, route) UNIQUE constraint already
-- provides the primary lookup index; this adds a cleanup/expiry-scan index.

BEGIN;

CREATE INDEX idx_api_idempotency_keys_created_at ON api.idempotency_keys (created_at);

INSERT INTO _migrations (filename) VALUES ('0143_create_api_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
