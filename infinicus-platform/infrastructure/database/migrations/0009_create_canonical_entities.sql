-- Migration: 0009_create_canonical_entities
-- Stage 2A — Canonical enterprise entity foundation in platform schema
-- Foundation tables only. Full layer-specific schemas belong to Stage 2B+.
-- Tables: customers, suppliers, employees, products, services, orders,
--         invoices, payments, inventory_items, warehouses, assets,
--         operational_events, metrics, simulations, decisions,
--         approved_actions, outcomes, learning_items

BEGIN;

-- ── platform.customers ───────────────────────────────────────────────────────

CREATE TABLE platform.customers (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  customer_type      text          NOT NULL DEFAULT 'individual',
  display_name       text          NOT NULL,
  email              citext,
  phone_number       text,
  external_reference text,
  status             text          NOT NULL DEFAULT 'active',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id   text,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at         timestamptz,
  CONSTRAINT customers_type_check CHECK (customer_type IN ('individual','business','government','other'))
);

-- ── platform.suppliers ───────────────────────────────────────────────────────

CREATE TABLE platform.suppliers (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  name             text          NOT NULL,
  supplier_code    citext        NOT NULL,
  email            citext,
  phone_number     text,
  risk_status      text          NOT NULL DEFAULT 'unknown',
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at       timestamptz,
  CONSTRAINT suppliers_code_business_unique UNIQUE (business_id, supplier_code)
);

-- ── platform.employees ───────────────────────────────────────────────────────

CREATE TABLE platform.employees (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)        ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)     ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)    ON DELETE RESTRICT,
  user_id              uuid          REFERENCES identity.users(id)                  ON DELETE SET NULL,
  employee_code        citext        NOT NULL,
  display_name         text          NOT NULL,
  employment_status    text          NOT NULL DEFAULT 'active',
  organization_unit_id uuid          REFERENCES platform.organization_units(id)     ON DELETE SET NULL,
  department_id        uuid          REFERENCES platform.departments(id)            ON DELETE SET NULL,
  status               text          NOT NULL DEFAULT 'active',
  version              integer       NOT NULL DEFAULT 1,
  source_system        text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id     text,
  correlation_id       uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now(),
  created_by           uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at           timestamptz,
  CONSTRAINT employees_code_business_unique UNIQUE (business_id, employee_code)
);

-- ── platform.products ────────────────────────────────────────────────────────

CREATE TABLE platform.products (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  product_code     citext        NOT NULL,
  name             text          NOT NULL,
  description      text,
  unit_of_measure  text          NOT NULL DEFAULT 'unit',
  currency_code    text          NOT NULL DEFAULT 'USD',
  standard_price   numeric(18,4) NOT NULL DEFAULT 0,
  standard_cost    numeric(18,4) NOT NULL DEFAULT 0,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at       timestamptz,
  CONSTRAINT products_code_business_unique UNIQUE (business_id, product_code)
);

-- ── platform.services ────────────────────────────────────────────────────────

CREATE TABLE platform.services (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  service_code     citext        NOT NULL,
  name             text          NOT NULL,
  description      text,
  currency_code    text          NOT NULL DEFAULT 'USD',
  standard_price   numeric(18,4) NOT NULL DEFAULT 0,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at       timestamptz,
  CONSTRAINT services_code_business_unique UNIQUE (business_id, service_code)
);

-- ── platform.orders ──────────────────────────────────────────────────────────

CREATE TABLE platform.orders (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  customer_id        uuid          REFERENCES platform.customers(id)           ON DELETE SET NULL,
  order_number       text          NOT NULL,
  order_date         date          NOT NULL,
  currency_code      text          NOT NULL DEFAULT 'USD',
  total_amount       numeric(18,4) NOT NULL DEFAULT 0,
  operational_status text          NOT NULL DEFAULT 'planned',
  status             text          NOT NULL DEFAULT 'active',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id   text,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT orders_op_status_check CHECK (
    operational_status IN ('planned','authorized','executed','completed','failed','reversed')
  ),
  CONSTRAINT orders_number_business_unique UNIQUE (business_id, order_number)
);

-- ── platform.invoices ────────────────────────────────────────────────────────

CREATE TABLE platform.invoices (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  customer_id        uuid          REFERENCES platform.customers(id)           ON DELETE SET NULL,
  order_id           uuid          REFERENCES platform.orders(id)              ON DELETE SET NULL,
  invoice_number     text          NOT NULL,
  issue_date         date          NOT NULL,
  due_date           date          NOT NULL,
  currency_code      text          NOT NULL DEFAULT 'USD',
  total_amount       numeric(18,4) NOT NULL DEFAULT 0,
  outstanding_amount numeric(18,4) NOT NULL DEFAULT 0,
  status             text          NOT NULL DEFAULT 'draft',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id   text,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT invoices_number_business_unique UNIQUE (business_id, invoice_number)
);

-- ── platform.payments ────────────────────────────────────────────────────────

CREATE TABLE platform.payments (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  customer_id        uuid          REFERENCES platform.customers(id)           ON DELETE SET NULL,
  invoice_id         uuid          REFERENCES platform.invoices(id)            ON DELETE SET NULL,
  payment_reference  text          NOT NULL,
  payment_date       date          NOT NULL,
  currency_code      text          NOT NULL DEFAULT 'USD',
  amount             numeric(18,4) NOT NULL DEFAULT 0,
  operational_status text          NOT NULL DEFAULT 'planned',
  status             text          NOT NULL DEFAULT 'active',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id   text,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT payments_op_status_check CHECK (
    operational_status IN ('planned','authorized','executed','completed','failed','reversed')
  )
);

-- ── platform.inventory_items ─────────────────────────────────────────────────

CREATE TABLE platform.inventory_items (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  product_id       uuid          REFERENCES platform.products(id)            ON DELETE SET NULL,
  sku              citext        NOT NULL,
  name             text          NOT NULL,
  unit_of_measure  text          NOT NULL DEFAULT 'unit',
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT inventory_items_sku_business_unique UNIQUE (business_id, sku)
);

-- ── platform.warehouses ──────────────────────────────────────────────────────

CREATE TABLE platform.warehouses (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  location_id      uuid          REFERENCES platform.locations(id)           ON DELETE SET NULL,
  warehouse_code   citext        NOT NULL,
  name             text          NOT NULL,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT warehouses_code_business_unique UNIQUE (business_id, warehouse_code)
);

-- ── platform.assets ──────────────────────────────────────────────────────────

CREATE TABLE platform.assets (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  asset_code       citext        NOT NULL,
  name             text          NOT NULL,
  asset_type       text          NOT NULL,
  location_id      uuid          REFERENCES platform.locations(id)           ON DELETE SET NULL,
  condition_status text          NOT NULL DEFAULT 'good',
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT assets_code_business_unique UNIQUE (business_id, asset_code)
);

-- ── platform.operational_events ──────────────────────────────────────────────
-- Append-only operational event log.

CREATE TABLE platform.operational_events (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  event_type     text          NOT NULL,
  entity_type    text          NOT NULL,
  entity_id      uuid          NOT NULL,
  payload        jsonb         NOT NULL DEFAULT '{}',
  occurred_at    timestamptz   NOT NULL DEFAULT now(),
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

-- ── platform.metrics ─────────────────────────────────────────────────────────

CREATE TABLE platform.metrics (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  metric_code    citext        NOT NULL,
  metric_name    text          NOT NULL,
  metric_value   numeric       NOT NULL,
  unit           text,
  measured_at    timestamptz   NOT NULL,
  dimensions     jsonb         NOT NULL DEFAULT '{}',
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

-- ── platform.simulations ─────────────────────────────────────────────────────

CREATE TABLE platform.simulations (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  simulation_type  text          NOT NULL,
  input_reference  jsonb         NOT NULL DEFAULT '{}',
  result_reference jsonb,
  started_at       timestamptz,
  completed_at     timestamptz,
  status           text          NOT NULL DEFAULT 'planned',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT simulations_status_check CHECK (
    status IN ('planned','authorized','executed','completed','failed','reversed')
  )
);

-- ── platform.decisions ───────────────────────────────────────────────────────

CREATE TABLE platform.decisions (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  decision_type  text          NOT NULL,
  recommendation jsonb         NOT NULL DEFAULT '{}',
  confidence     numeric(5,4)  NOT NULL DEFAULT 0,
  generated_at   timestamptz   NOT NULL DEFAULT now(),
  status         text          NOT NULL DEFAULT 'active',
  version        integer       NOT NULL DEFAULT 1,
  source_system  text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  created_by     uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT decisions_confidence_check CHECK (confidence >= 0 AND confidence <= 1)
);

-- ── platform.approved_actions ────────────────────────────────────────────────

CREATE TABLE platform.approved_actions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  decision_id     uuid          REFERENCES platform.decisions(id)           ON DELETE SET NULL,
  action_type     text          NOT NULL,
  action_payload  jsonb         NOT NULL DEFAULT '{}',
  approval_status text          NOT NULL DEFAULT 'pending',
  approved_at     timestamptz,
  approved_by     uuid          REFERENCES identity.users(id)               ON DELETE SET NULL,
  status          text          NOT NULL DEFAULT 'active',
  version         integer       NOT NULL DEFAULT 1,
  source_system   text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id  uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  created_by      uuid          REFERENCES identity.users(id)               ON DELETE SET NULL,
  CONSTRAINT approved_actions_approval_status_check CHECK (
    approval_status IN ('pending','approved','rejected','expired')
  )
);

-- ── platform.outcomes ────────────────────────────────────────────────────────

CREATE TABLE platform.outcomes (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)          ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)       ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)      ON DELETE RESTRICT,
  approved_action_id uuid          REFERENCES platform.approved_actions(id)         ON DELETE SET NULL,
  outcome_type       text          NOT NULL,
  expected_value     jsonb,
  observed_value     jsonb,
  evaluated_at       timestamptz   NOT NULL DEFAULT now(),
  status             text          NOT NULL DEFAULT 'active',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL
);

-- ── platform.learning_items ──────────────────────────────────────────────────

CREATE TABLE platform.learning_items (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  outcome_id          uuid          REFERENCES platform.outcomes(id)            ON DELETE SET NULL,
  learning_type       text          NOT NULL,
  summary             text          NOT NULL,
  confidence          numeric(5,4)  NOT NULL DEFAULT 0,
  reliability         numeric(5,4)  NOT NULL DEFAULT 0,
  applicability_scope jsonb         NOT NULL DEFAULT '{}',
  status              text          NOT NULL DEFAULT 'active',
  version             integer       NOT NULL DEFAULT 1,
  source_system       text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  created_by          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT learning_items_confidence_check  CHECK (confidence  >= 0 AND confidence  <= 1),
  CONSTRAINT learning_items_reliability_check CHECK (reliability >= 0 AND reliability <= 1)
);

INSERT INTO _migrations (filename) VALUES ('0009_create_canonical_entities.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
