-- Migration: 0164_create_products_triggers
-- updated_at trigger for business_operations.products (0161). Reuses
-- set_updated_at() defined in Stage 1 (0001_foundation.sql) — same pattern
-- as every other mutable table's trigger (see 0022_create_da_triggers_events.sql).

BEGIN;

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON business_operations.products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO _migrations (filename) VALUES ('0164_create_products_triggers.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
