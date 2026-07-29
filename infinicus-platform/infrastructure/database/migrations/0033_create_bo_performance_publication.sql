-- Migration: 0033_create_bo_performance_publication
-- Stage 2C — Operational performance records (append-only), BO publication packages and deployment metadata

BEGIN;

-- ── business_operations.operational_performance_records ──────────────────────
-- Append-only KPI snapshot log.

CREATE TABLE business_operations.operational_performance_records (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  metric_code      text          NOT NULL,
  metric_name      text          NOT NULL,
  metric_category  text          NOT NULL CHECK (metric_category IN (
                                   'sales','procurement','inventory','workforce','finance',
                                   'support','compliance','fulfilment','asset','other'
                                 )),
  period_start     timestamptz   NOT NULL,
  period_end       timestamptz   NOT NULL,
  numeric_value    numeric       NOT NULL,
  unit             text,
  target_value     numeric,
  variance         numeric,
  dimensions       jsonb         NOT NULL DEFAULT '{}',
  recorded_by      uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT opr_period_check CHECK (period_end > period_start)
);

-- ── business_operations.bo_publication_packages ───────────────────────────────
-- Records a BO → BI layer data handoff package.

CREATE TABLE business_operations.bo_publication_packages (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  package_code      text          NOT NULL,
  target_layer      text          NOT NULL DEFAULT 'business_intelligence'
                                  CHECK (target_layer IN (
                                    'business_intelligence','business_digital_twin',
                                    'simulation','ai_decision_intelligence','other'
                                  )),
  target_block      text          NOT NULL,
  period_start      timestamptz   NOT NULL,
  period_end        timestamptz   NOT NULL,
  record_count      integer       NOT NULL DEFAULT 0,
  payload_reference jsonb         NOT NULL DEFAULT '{}',
  package_status    text          NOT NULL DEFAULT 'draft' CHECK (package_status IN (
                                    'draft','ready','dispatched','received','failed','cancelled'
                                  )),
  dispatched_at     timestamptz,
  acknowledged_at   timestamptz,
  status            text          NOT NULL DEFAULT 'active',
  version           integer       NOT NULL DEFAULT 1,
  source_system     text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  created_by        uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT bo_publication_packages_code_unique UNIQUE (business_id, package_code),
  CONSTRAINT bo_publication_packages_period_check CHECK (period_end > period_start)
);

-- ── business_operations.bo_handoff_records ────────────────────────────────────
-- Append-only audit of every cross-layer handoff event.

CREATE TABLE business_operations.bo_handoff_records (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)                          ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)                       ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)                      ON DELETE RESTRICT,
  publication_id      uuid          NOT NULL REFERENCES business_operations.bo_publication_packages(id) ON DELETE RESTRICT,
  handoff_type        text          NOT NULL CHECK (handoff_type IN (
                                      'dispatch','acknowledgement','failure','retry','cancellation'
                                    )),
  source_layer        text          NOT NULL DEFAULT 'business_operations',
  target_layer        text          NOT NULL,
  target_block        text          NOT NULL,
  record_count        integer       NOT NULL DEFAULT 0,
  notes               text,
  payload             jsonb         NOT NULL DEFAULT '{}',
  occurred_at         timestamptz   NOT NULL DEFAULT now(),
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now()
);

-- ── business_operations.bo_layer_assemblies ───────────────────────────────────

CREATE TABLE business_operations.bo_layer_assemblies (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  assembly_code      text          NOT NULL,
  assembly_version   text          NOT NULL,
  publication_ids    uuid[]        NOT NULL DEFAULT '{}',
  assembled_at       timestamptz   NOT NULL DEFAULT now(),
  assembled_by       uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  state              text          NOT NULL DEFAULT 'assembling' CHECK (state IN (
                                     'assembling','ready','deployed','superseded','failed'
                                   )),
  manifest           jsonb         NOT NULL DEFAULT '{}',
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT bo_layer_assemblies_code_workspace_unique UNIQUE (workspace_id, assembly_code)
);

-- ── business_operations.bo_layer_deployments ──────────────────────────────────

CREATE TABLE business_operations.bo_layer_deployments (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)                           ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)                        ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)                       ON DELETE RESTRICT,
  assembly_id      uuid          NOT NULL REFERENCES business_operations.bo_layer_assemblies(id)   ON DELETE RESTRICT,
  deployed_at      timestamptz   NOT NULL DEFAULT now(),
  deployed_by      uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  deployment_notes text,
  rollback_id      uuid          REFERENCES business_operations.bo_layer_assemblies(id) ON DELETE SET NULL,
  outcome          text          NOT NULL DEFAULT 'success' CHECK (outcome IN (
                                   'success','partial','failed'
                                 )),
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0033_create_bo_performance_publication.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
