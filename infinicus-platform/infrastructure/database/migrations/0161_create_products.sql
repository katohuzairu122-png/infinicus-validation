-- Migration: 0161_create_products
-- Business Operations — a business's own catalog of sellable items (product
-- or service), letting Operations offer a tap-to-log-sale grid (price
-- pre-filled from the catalog) instead of typing an amount by hand every
-- time. Purely a convenience layer over business_operations.business_events
-- (0158) — logging a sale from the catalog still just inserts a normal
-- 'sale' event; nothing here is read by TwinComputationService or any
-- aggregate query. Mutable (unlike the event ledger) since a business edits
-- its own menu/catalog over time — hence updated_at + the trigger below,
-- and active (soft delete) rather than a hard DELETE so past events logged
-- against a since-removed product still make sense in history.

BEGIN;

CREATE TABLE business_operations.products (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  name            text          NOT NULL,
  price           numeric(18,4) NOT NULL CHECK (price >= 0),
  category        text          NOT NULL DEFAULT 'other',
  icon            text,
  active          boolean       NOT NULL DEFAULT true,
  sort_order      integer       NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0161_create_products.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
