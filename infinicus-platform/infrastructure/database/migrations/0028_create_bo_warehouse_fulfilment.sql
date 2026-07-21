-- Migration: 0028_create_bo_warehouse_fulfilment
-- Stage 2C — Warehouse zones, storage locations, fulfilment orders, delivery notes

BEGIN;

-- ── business_operations.warehouse_zones ──────────────────────────────────────

CREATE TABLE business_operations.warehouse_zones (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  warehouse_id   uuid          NOT NULL REFERENCES platform.warehouses(id)  ON DELETE RESTRICT,
  zone_code      text          NOT NULL,
  zone_name      text          NOT NULL,
  zone_type      text          NOT NULL DEFAULT 'general' CHECK (zone_type IN (
                                 'receiving','shipping','storage','staging','returns',
                                 'cold_storage','hazmat','general','other'
                               )),
  capacity_units numeric(18,4),
  status         text          NOT NULL DEFAULT 'active',
  version        integer       NOT NULL DEFAULT 1,
  source_system  text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  created_by     uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT warehouse_zones_code_unique UNIQUE (warehouse_id, zone_code)
);

-- ── business_operations.storage_locations ────────────────────────────────────

CREATE TABLE business_operations.storage_locations (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)                 ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)              ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)             ON DELETE RESTRICT,
  zone_id          uuid          NOT NULL REFERENCES business_operations.warehouse_zones(id) ON DELETE RESTRICT,
  location_code    text          NOT NULL,
  aisle            text,
  bay              text,
  level            text,
  bin              text,
  capacity_units   numeric(18,4),
  is_occupied      boolean       NOT NULL DEFAULT false,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT storage_locations_code_zone_unique UNIQUE (zone_id, location_code)
);

-- ── business_operations.fulfilment_orders ─────────────────────────────────────

CREATE TABLE business_operations.fulfilment_orders (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  order_id             uuid          NOT NULL REFERENCES platform.orders(id)      ON DELETE RESTRICT,
  warehouse_id         uuid          NOT NULL REFERENCES platform.warehouses(id)  ON DELETE RESTRICT,
  fulfilment_number    text          NOT NULL,
  fulfilment_type      text          NOT NULL DEFAULT 'ship' CHECK (fulfilment_type IN (
                                       'ship','pickup','delivery','partial','other'
                                     )),
  fulfilment_status    text          NOT NULL DEFAULT 'planned' CHECK (fulfilment_status IN (
                                       'planned','authorized','picking','packed',
                                       'dispatched','delivered','failed','cancelled'
                                     )),
  assigned_to          uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  promised_date        date,
  dispatched_at        timestamptz,
  delivered_at         timestamptz,
  tracking_reference   text,
  notes                text,
  status               text          NOT NULL DEFAULT 'active',
  version              integer       NOT NULL DEFAULT 1,
  source_system        text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id       uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now(),
  created_by           uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT fulfilment_orders_number_business_unique UNIQUE (business_id, fulfilment_number)
);

-- ── business_operations.fulfilment_items ──────────────────────────────────────

CREATE TABLE business_operations.fulfilment_items (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)                     ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)                  ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)                 ON DELETE RESTRICT,
  fulfilment_order_id uuid         NOT NULL REFERENCES business_operations.fulfilment_orders(id) ON DELETE RESTRICT,
  order_line_id      uuid          REFERENCES business_operations.order_line_items(id)         ON DELETE SET NULL,
  inventory_item_id  uuid          REFERENCES platform.inventory_items(id)                     ON DELETE SET NULL,
  storage_location_id uuid         REFERENCES business_operations.storage_locations(id)        ON DELETE SET NULL,
  quantity_ordered   numeric(18,4) NOT NULL CHECK (quantity_ordered > 0),
  quantity_picked    numeric(18,4) NOT NULL DEFAULT 0,
  quantity_packed    numeric(18,4) NOT NULL DEFAULT 0,
  quantity_shipped   numeric(18,4) NOT NULL DEFAULT 0,
  item_status        text          NOT NULL DEFAULT 'pending' CHECK (item_status IN (
                                     'pending','picking','picked','packed','shipped','cancelled'
                                   )),
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

-- ── business_operations.delivery_notes ────────────────────────────────────────
-- Append-only proof-of-delivery record.

CREATE TABLE business_operations.delivery_notes (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)                      ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)                   ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)                  ON DELETE RESTRICT,
  fulfilment_order_id  uuid          NOT NULL REFERENCES business_operations.fulfilment_orders(id) ON DELETE RESTRICT,
  note_number          text          NOT NULL,
  delivered_at         timestamptz   NOT NULL DEFAULT now(),
  received_by          text,
  signature_reference  text,
  delivery_address     jsonb         NOT NULL DEFAULT '{}',
  notes                text,
  payload              jsonb         NOT NULL DEFAULT '{}',
  correlation_id       uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT delivery_notes_number_business_unique UNIQUE (business_id, note_number)
);

INSERT INTO _migrations (filename) VALUES ('0028_create_bo_warehouse_fulfilment.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
