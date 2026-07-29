-- Migration: 0027_create_bo_supplier_inventory
-- Stage 2C — Supplier agreements, performance scores, inventory balances and movements

BEGIN;

-- ── business_operations.supplier_agreements ───────────────────────────────────

CREATE TABLE business_operations.supplier_agreements (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  supplier_id        uuid          NOT NULL REFERENCES platform.suppliers(id)   ON DELETE RESTRICT,
  agreement_code     text          NOT NULL,
  agreement_type     text          NOT NULL DEFAULT 'framework' CHECK (agreement_type IN (
                                     'framework','spot','preferred','exclusive','other'
                                   )),
  valid_from         date          NOT NULL,
  valid_to           date,
  payment_terms_days integer       NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
  currency_code      text          NOT NULL DEFAULT 'USD',
  max_order_value    numeric(18,4),
  discount_rate      numeric(5,4)  NOT NULL DEFAULT 0 CHECK (discount_rate BETWEEN 0 AND 1),
  agreement_status   text          NOT NULL DEFAULT 'draft' CHECK (agreement_status IN (
                                     'draft','active','suspended','expired','terminated'
                                   )),
  notes              text,
  status             text          NOT NULL DEFAULT 'active',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT supplier_agreements_code_business_unique UNIQUE (business_id, agreement_code),
  CONSTRAINT supplier_agreements_period_check CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- ── business_operations.supplier_performance_scores ───────────────────────────
-- Append-only periodic performance evaluation.

CREATE TABLE business_operations.supplier_performance_scores (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  supplier_id      uuid          NOT NULL REFERENCES platform.suppliers(id)   ON DELETE RESTRICT,
  period_start     date          NOT NULL,
  period_end       date          NOT NULL,
  quality_score    numeric(5,2)  NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  delivery_score   numeric(5,2)  NOT NULL CHECK (delivery_score BETWEEN 0 AND 100),
  price_score      numeric(5,2)  NOT NULL CHECK (price_score BETWEEN 0 AND 100),
  service_score    numeric(5,2)  NOT NULL CHECK (service_score BETWEEN 0 AND 100),
  overall_score    numeric(5,2)  NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  evaluated_by     uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  notes            text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT sps_period_check CHECK (period_end >= period_start)
);

-- ── business_operations.inventory_balances ────────────────────────────────────
-- Current on-hand balance per inventory item per warehouse location.

CREATE TABLE business_operations.inventory_balances (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)          ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)       ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)      ON DELETE RESTRICT,
  inventory_item_id   uuid          NOT NULL REFERENCES platform.inventory_items(id) ON DELETE RESTRICT,
  warehouse_id        uuid          NOT NULL REFERENCES platform.warehouses(id)      ON DELETE RESTRICT,
  quantity_on_hand    numeric(18,4) NOT NULL DEFAULT 0,
  quantity_reserved   numeric(18,4) NOT NULL DEFAULT 0,
  quantity_available  numeric(18,4) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_point       numeric(18,4) NOT NULL DEFAULT 0,
  reorder_quantity    numeric(18,4) NOT NULL DEFAULT 0,
  last_movement_at    timestamptz,
  status              text          NOT NULL DEFAULT 'active',
  version             integer       NOT NULL DEFAULT 1,
  source_system       text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT inventory_balances_item_warehouse_unique UNIQUE (inventory_item_id, warehouse_id),
  CONSTRAINT inventory_balances_reserved_check CHECK (quantity_reserved >= 0),
  CONSTRAINT inventory_balances_on_hand_check  CHECK (quantity_on_hand  >= 0)
);

-- ── business_operations.inventory_movements ───────────────────────────────────
-- Append-only stock change ledger.

CREATE TABLE business_operations.inventory_movements (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)          ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)       ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)      ON DELETE RESTRICT,
  inventory_item_id   uuid          NOT NULL REFERENCES platform.inventory_items(id) ON DELETE RESTRICT,
  warehouse_id        uuid          NOT NULL REFERENCES platform.warehouses(id)      ON DELETE RESTRICT,
  movement_type       text          NOT NULL CHECK (movement_type IN (
                                      'receipt','issue','transfer_in','transfer_out',
                                      'adjustment','return','write_off','cycle_count'
                                    )),
  quantity            numeric(18,4) NOT NULL,
  reference_type      text          CHECK (reference_type IN (
                                      'purchase_receipt','order_line','transfer',
                                      'adjustment','manual','other'
                                    )),
  reference_id        uuid,
  unit_cost           numeric(18,4),
  performed_by        uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  occurred_at         timestamptz   NOT NULL DEFAULT now(),
  notes               text,
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0027_create_bo_supplier_inventory.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
