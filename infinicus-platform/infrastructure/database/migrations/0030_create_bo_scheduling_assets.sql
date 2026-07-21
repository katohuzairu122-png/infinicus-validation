-- Migration: 0030_create_bo_scheduling_assets
-- Stage 2C — Resource bookings, maintenance schedules, maintenance records (append-only), asset inspections (append-only)

BEGIN;

-- ── business_operations.resource_bookings ────────────────────────────────────

CREATE TABLE business_operations.resource_bookings (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  booking_code     text          NOT NULL,
  resource_type    text          NOT NULL CHECK (resource_type IN (
                                   'room','equipment','vehicle','employee','other'
                                 )),
  resource_id      uuid,
  booked_by        uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  starts_at        timestamptz   NOT NULL,
  ends_at          timestamptz   NOT NULL,
  purpose          text,
  booking_status   text          NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN (
                                   'tentative','confirmed','cancelled','completed'
                                 )),
  reference_type   text,
  reference_id     uuid,
  status           text          NOT NULL DEFAULT 'active',
  version          integer       NOT NULL DEFAULT 1,
  source_system    text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  created_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT resource_bookings_code_business_unique UNIQUE (business_id, booking_code),
  CONSTRAINT resource_bookings_period_check CHECK (ends_at > starts_at)
);

-- ── business_operations.maintenance_schedules ─────────────────────────────────

CREATE TABLE business_operations.maintenance_schedules (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  asset_id           uuid          NOT NULL REFERENCES platform.assets(id)      ON DELETE RESTRICT,
  schedule_code      text          NOT NULL,
  maintenance_type   text          NOT NULL DEFAULT 'preventive' CHECK (maintenance_type IN (
                                     'preventive','corrective','predictive','condition_based','other'
                                   )),
  frequency_unit     text          NOT NULL DEFAULT 'monthly' CHECK (frequency_unit IN (
                                     'daily','weekly','monthly','quarterly','annually','on_demand'
                                   )),
  frequency_interval integer       NOT NULL DEFAULT 1 CHECK (frequency_interval > 0),
  next_due_date      date,
  last_completed_at  timestamptz,
  assigned_to        uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  instructions       text,
  status             text          NOT NULL DEFAULT 'active',
  version            integer       NOT NULL DEFAULT 1,
  source_system      text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  created_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT maintenance_schedules_code_business_unique UNIQUE (business_id, schedule_code)
);

-- ── business_operations.maintenance_records ───────────────────────────────────
-- Append-only: actual maintenance work log.

CREATE TABLE business_operations.maintenance_records (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid          NOT NULL REFERENCES tenancy.tenants(id)                          ON DELETE RESTRICT,
  workspace_id          uuid          NOT NULL REFERENCES tenancy.workspaces(id)                       ON DELETE RESTRICT,
  business_id           uuid          NOT NULL REFERENCES platform.businesses(id)                      ON DELETE RESTRICT,
  asset_id              uuid          NOT NULL REFERENCES platform.assets(id)                          ON DELETE RESTRICT,
  maintenance_schedule_id uuid        REFERENCES business_operations.maintenance_schedules(id)         ON DELETE SET NULL,
  maintenance_type      text          NOT NULL CHECK (maintenance_type IN (
                                        'preventive','corrective','predictive','condition_based','emergency','other'
                                      )),
  performed_by          uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  started_at            timestamptz   NOT NULL,
  completed_at          timestamptz,
  duration_minutes      integer,
  parts_used            jsonb         NOT NULL DEFAULT '[]',
  labour_cost           numeric(18,4),
  parts_cost            numeric(18,4),
  outcome               text          NOT NULL CHECK (outcome IN (
                                        'completed','partially_completed','deferred','failed'
                                      )),
  findings              text,
  next_action           text,
  correlation_id        uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at            timestamptz   NOT NULL DEFAULT now()
);

-- ── business_operations.asset_inspections ────────────────────────────────────
-- Append-only inspection log.

CREATE TABLE business_operations.asset_inspections (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  asset_id          uuid          NOT NULL REFERENCES platform.assets(id)      ON DELETE RESTRICT,
  inspection_type   text          NOT NULL DEFAULT 'routine' CHECK (inspection_type IN (
                                    'routine','safety','regulatory','pre_use','post_use','other'
                                  )),
  inspected_by      uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  inspected_at      timestamptz   NOT NULL DEFAULT now(),
  condition_rating  text          NOT NULL CHECK (condition_rating IN (
                                    'excellent','good','fair','poor','critical'
                                  )),
  pass_fail         boolean       NOT NULL DEFAULT true,
  findings          text,
  actions_required  text,
  next_inspection_date date,
  checklist_results jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0030_create_bo_scheduling_assets.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
