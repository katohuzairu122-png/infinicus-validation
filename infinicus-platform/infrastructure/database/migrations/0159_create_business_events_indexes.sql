-- Migration: 0159_create_business_events_indexes
-- Indexes for business_operations.business_events (0158) — supports the
-- KPI-rollup queries (aggregate by business + event_type + date range) and
-- customer-level lookups (top_customer / customer history).

BEGIN;

CREATE INDEX idx_biz_events_tenant       ON business_operations.business_events (tenant_id);
CREATE INDEX idx_biz_events_workspace    ON business_operations.business_events (workspace_id);
CREATE INDEX idx_biz_events_business     ON business_operations.business_events (business_id);
CREATE INDEX idx_biz_events_type_time    ON business_operations.business_events (business_id, event_type, occurred_at);
CREATE INDEX idx_biz_events_customer     ON business_operations.business_events (business_id, customer_id) WHERE customer_id IS NOT NULL;

INSERT INTO _migrations (filename) VALUES ('0159_create_business_events_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
