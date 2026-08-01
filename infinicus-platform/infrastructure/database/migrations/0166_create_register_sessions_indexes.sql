-- Migration: 0166_create_register_sessions_indexes
-- Indexes for business_operations.register_sessions (0165), plus the
-- business rule that a business can only have one open register session
-- at a time — enforced here, not just in application code, since it's a
-- real invariant (two simultaneously "open" registers would make cash
-- reconciliation meaningless).

BEGIN;

CREATE INDEX idx_register_sessions_tenant     ON business_operations.register_sessions (tenant_id);
CREATE INDEX idx_register_sessions_workspace  ON business_operations.register_sessions (workspace_id);
CREATE INDEX idx_register_sessions_business   ON business_operations.register_sessions (business_id, opened_at DESC);

CREATE UNIQUE INDEX idx_register_sessions_one_open_per_business
  ON business_operations.register_sessions (business_id)
  WHERE status = 'open';

INSERT INTO _migrations (filename) VALUES ('0166_create_register_sessions_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
