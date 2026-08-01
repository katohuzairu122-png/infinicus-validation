-- Migration: 0168_create_register_sessions_triggers
-- updated_at trigger for business_operations.register_sessions (0165).
-- Reuses set_updated_at() defined in Stage 1 (0001_foundation.sql) — same
-- pattern as every other mutable table's trigger (see
-- 0164_create_products_triggers.sql).

BEGIN;

CREATE TRIGGER set_updated_at_register_sessions
  BEFORE UPDATE ON business_operations.register_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO _migrations (filename) VALUES ('0168_create_register_sessions_triggers.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
