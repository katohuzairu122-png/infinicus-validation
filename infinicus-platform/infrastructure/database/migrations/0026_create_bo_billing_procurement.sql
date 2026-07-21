-- Migration: 0026_create_bo_billing_procurement
-- Stage 2C — Invoice line detail, payment allocations, credit notes, purchase orders

BEGIN;

-- ── business_operations.invoice_line_items ────────────────────────────────────

CREATE TABLE business_operations.invoice_line_items (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  invoice_id     uuid          NOT NULL REFERENCES platform.invoices(id)    ON DELETE RESTRICT,
  order_line_id  uuid          REFERENCES business_operations.order_line_items(id) ON DELETE SET NULL,
  line_number    integer       NOT NULL CHECK (line_number > 0),
  item_type      text          NOT NULL DEFAULT 'product' CHECK (item_type IN ('product','service','fee','discount','other')),
  product_id     uuid          REFERENCES platform.products(id)  ON DELETE SET NULL,
  service_id     uuid          REFERENCES platform.services(id)  ON DELETE SET NULL,
  description    text          NOT NULL,
  quantity       numeric(18,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price     numeric(18,4) NOT NULL DEFAULT 0,
  discount_rate  numeric(5,4)  NOT NULL DEFAULT 0 CHECK (discount_rate BETWEEN 0 AND 1),
  tax_rate       numeric(5,4)  NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  line_total     numeric(18,4) NOT NULL DEFAULT 0,
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT invoice_line_items_unique UNIQUE (invoice_id, line_number)
);

-- ── business_operations.payment_allocations ────────────────────────────────────
-- Maps partial payments to specific invoices.

CREATE TABLE business_operations.payment_allocations (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  payment_id     uuid          NOT NULL REFERENCES platform.payments(id)    ON DELETE RESTRICT,
  invoice_id     uuid          NOT NULL REFERENCES platform.invoices(id)    ON DELETE RESTRICT,
  allocated_amount numeric(18,4) NOT NULL CHECK (allocated_amount > 0),
  currency_code  text          NOT NULL DEFAULT 'USD',
  allocated_at   timestamptz   NOT NULL DEFAULT now(),
  notes          text,
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

-- ── business_operations.credit_notes ─────────────────────────────────────────

CREATE TABLE business_operations.credit_notes (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  customer_id        uuid          NOT NULL REFERENCES platform.customers(id)   ON DELETE RESTRICT,
  invoice_id         uuid          REFERENCES platform.invoices(id)             ON DELETE SET NULL,
  credit_note_number text          NOT NULL,
  issue_date         date          NOT NULL DEFAULT CURRENT_DATE,
  currency_code      text          NOT NULL DEFAULT 'USD',
  amount             numeric(18,4) NOT NULL CHECK (amount > 0),
  reason             text          NOT NULL,
  credit_note_status text          NOT NULL DEFAULT 'draft' CHECK (credit_note_status IN (
                                     'draft','issued','applied','cancelled'
                                   )),
  status             text          NOT NULL DEFAULT 'active',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT credit_notes_number_business_unique UNIQUE (business_id, credit_note_number)
);

-- ── business_operations.purchase_orders ──────────────────────────────────────

CREATE TABLE business_operations.purchase_orders (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  supplier_id     uuid          NOT NULL REFERENCES platform.suppliers(id)   ON DELETE RESTRICT,
  po_number       text          NOT NULL,
  order_date      date          NOT NULL DEFAULT CURRENT_DATE,
  expected_date   date,
  currency_code   text          NOT NULL DEFAULT 'USD',
  total_amount    numeric(18,4) NOT NULL DEFAULT 0,
  po_status       text          NOT NULL DEFAULT 'draft' CHECK (po_status IN (
                                  'draft','submitted','approved','partially_received',
                                  'received','cancelled'
                                )),
  approved_by     uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  approved_at     timestamptz,
  notes           text,
  status          text          NOT NULL DEFAULT 'active',
  version         integer       NOT NULL DEFAULT 1,
  source_system   text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id  uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  created_by      uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT purchase_orders_number_business_unique UNIQUE (business_id, po_number)
);

-- ── business_operations.purchase_order_line_items ────────────────────────────

CREATE TABLE business_operations.purchase_order_line_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)                   ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)                ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id)               ON DELETE RESTRICT,
  purchase_order_id uuid        NOT NULL REFERENCES business_operations.purchase_orders(id) ON DELETE RESTRICT,
  line_number     integer       NOT NULL CHECK (line_number > 0),
  product_id      uuid          REFERENCES platform.products(id)  ON DELETE SET NULL,
  description     text          NOT NULL,
  quantity        numeric(18,4) NOT NULL CHECK (quantity > 0),
  unit_price      numeric(18,4) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,4)  NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  line_total      numeric(18,4) NOT NULL DEFAULT 0,
  received_qty    numeric(18,4) NOT NULL DEFAULT 0,
  correlation_id  uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT po_line_items_unique UNIQUE (purchase_order_id, line_number)
);

-- ── business_operations.purchase_receipts ─────────────────────────────────────
-- Goods receipt records (append-only).

CREATE TABLE business_operations.purchase_receipts (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)                   ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)                ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)               ON DELETE RESTRICT,
  purchase_order_id   uuid          NOT NULL REFERENCES business_operations.purchase_orders(id) ON DELETE RESTRICT,
  receipt_number      text          NOT NULL,
  received_at         timestamptz   NOT NULL DEFAULT now(),
  received_by         uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  warehouse_id        uuid          REFERENCES platform.warehouses(id) ON DELETE SET NULL,
  notes               text,
  payload             jsonb         NOT NULL DEFAULT '{}',
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT purchase_receipts_number_business_unique UNIQUE (business_id, receipt_number)
);

INSERT INTO _migrations (filename) VALUES ('0026_create_bo_billing_procurement.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
