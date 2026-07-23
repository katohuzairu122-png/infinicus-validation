-- Migration: 0145_create_api_triggers
-- BUILD-21 — updated_at trigger for api.idempotency_keys
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql). No outbox
-- events are emitted here — idempotency-key bookkeeping is HTTP-layer
-- infrastructure, not a business event.

BEGIN;

CREATE TRIGGER set_updated_at_idempotency_keys
  BEFORE UPDATE ON api.idempotency_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO _migrations (filename) VALUES ('0145_create_api_triggers.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
