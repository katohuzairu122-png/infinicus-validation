-- Migration: 0162_create_products_indexes
-- Indexes for business_operations.products (0161) — supports the catalog
-- grid's "active items for this business, grouped by category, in display
-- order" query.

BEGIN;

CREATE INDEX idx_products_tenant           ON business_operations.products (tenant_id);
CREATE INDEX idx_products_workspace        ON business_operations.products (workspace_id);
CREATE INDEX idx_products_business_active  ON business_operations.products (business_id, active, category, sort_order);

INSERT INTO _migrations (filename) VALUES ('0162_create_products_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
