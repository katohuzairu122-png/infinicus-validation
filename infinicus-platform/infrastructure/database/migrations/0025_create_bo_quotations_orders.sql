-- Migration: 0025_create_bo_quotations_orders
-- Stage 2C — Quotation management and order line detail

BEGIN;

-- ── business_operations.quotations ───────────────────────────────────────────

CREATE TABLE business_operations.quotations (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)                   ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)                ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)               ON DELETE RESTRICT,
  customer_id       uuid          NOT NULL REFERENCES platform.customers(id)                ON DELETE RESTRICT,
  opportunity_id    uuid          REFERENCES business_operations.opportunities(id)          ON DELETE SET NULL,
  quotation_number  text          NOT NULL,
  issue_date        date          NOT NULL DEFAULT CURRENT_DATE,
  expiry_date       date,
  currency_code     text          NOT NULL DEFAULT 'USD',
  subtotal_amount   numeric(18,4) NOT NULL DEFAULT 0,
  discount_amount   numeric(18,4) NOT NULL DEFAULT 0,
  tax_amount        numeric(18,4) NOT NULL DEFAULT 0,
  total_amount      numeric(18,4) NOT NULL DEFAULT 0,
  quotation_status  text          NOT NULL DEFAULT 'draft' CHECK (quotation_status IN (
                                    'draft','sent','accepted','rejected','expired','converted'
                                  )),
  order_id          uuid          REFERENCES platform.orders(id) ON DELETE SET NULL,
  notes             text,
  terms             text,
  status            text          NOT NULL DEFAULT 'active',
  version           integer       NOT NULL DEFAULT 1,
  source_system     text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id  text,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  created_by        uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT quotations_number_business_unique UNIQUE (business_id, quotation_number),
  CONSTRAINT quotations_expiry_check CHECK (expiry_date IS NULL OR expiry_date >= issue_date)
);

-- ── business_operations.quotation_line_items ──────────────────────────────────

CREATE TABLE business_operations.quotation_line_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)                ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)             ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id)            ON DELETE RESTRICT,
  quotation_id    uuid          NOT NULL REFERENCES business_operations.quotations(id) ON DELETE RESTRICT,
  line_number     integer       NOT NULL CHECK (line_number > 0),
  item_type       text          NOT NULL DEFAULT 'product' CHECK (item_type IN ('product','service','fee','discount','other')),
  product_id      uuid          REFERENCES platform.products(id)  ON DELETE SET NULL,
  service_id      uuid          REFERENCES platform.services(id)  ON DELETE SET NULL,
  description     text          NOT NULL,
  quantity        numeric(18,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      numeric(18,4) NOT NULL DEFAULT 0,
  discount_rate   numeric(5,4)  NOT NULL DEFAULT 0 CHECK (discount_rate BETWEEN 0 AND 1),
  tax_rate        numeric(5,4)  NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  line_total      numeric(18,4) NOT NULL DEFAULT 0,
  correlation_id  uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT quotation_line_items_unique UNIQUE (quotation_id, line_number)
);

-- ── business_operations.order_line_items ──────────────────────────────────────
-- Extends platform.orders with per-line detail.

CREATE TABLE business_operations.order_line_items (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  order_id       uuid          NOT NULL REFERENCES platform.orders(id)     ON DELETE RESTRICT,
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
  fulfilled_qty  numeric(18,4) NOT NULL DEFAULT 0,
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT order_line_items_unique UNIQUE (order_id, line_number)
);

-- ── business_operations.order_events ─────────────────────────────────────────
-- Append-only order lifecycle event log.

CREATE TABLE business_operations.order_events (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  order_id       uuid          NOT NULL REFERENCES platform.orders(id)     ON DELETE RESTRICT,
  event_type     text          NOT NULL CHECK (event_type IN (
                                 'created','authorized','executed','completed',
                                 'failed','reversed','note','other'
                               )),
  previous_status text,
  new_status      text,
  performed_by    uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  notes           text,
  payload         jsonb         NOT NULL DEFAULT '{}',
  occurred_at     timestamptz   NOT NULL DEFAULT now(),
  correlation_id  uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0025_create_bo_quotations_orders.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
