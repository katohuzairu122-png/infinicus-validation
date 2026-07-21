-- Migration: 0023_create_bo_core_profile
-- Stage 2C — Business Operations schema creation + business profile extension tables

BEGIN;

CREATE SCHEMA IF NOT EXISTS business_operations;

-- ── business_operations.business_profile_extensions ──────────────────────────
-- Extends platform.businesses with BO-layer operational detail.
-- One row per business per workspace (FK to platform.businesses).

CREATE TABLE business_operations.business_profile_extensions (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  fiscal_year_start    integer       NOT NULL DEFAULT 1
                                     CHECK (fiscal_year_start BETWEEN 1 AND 12),
  default_currency     text          NOT NULL DEFAULT 'USD',
  tax_identification   text,
  industry_code        text,
  employee_count_band  text          CHECK (employee_count_band IN (
                                       '1-9','10-49','50-249','250-999','1000+'
                                     )),
  operational_status   text          NOT NULL DEFAULT 'active'
                                     CHECK (operational_status IN (
                                       'planned','active','suspended','closed'
                                     )),
  metadata             jsonb         NOT NULL DEFAULT '{}',
  version              integer       NOT NULL DEFAULT 1,
  source_system        text          NOT NULL DEFAULT 'INFINICUS',
  source_record_id     text,
  correlation_id       uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now(),
  created_by           uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT bpe_business_workspace_unique UNIQUE (business_id, workspace_id)
);

-- ── business_operations.department_responsibilities ───────────────────────────
-- Maps platform.departments to specific BO operational responsibilities.

CREATE TABLE business_operations.department_responsibilities (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  department_id       uuid          NOT NULL REFERENCES platform.departments(id) ON DELETE RESTRICT,
  responsibility_code text          NOT NULL,
  responsibility_name text          NOT NULL,
  category            text          NOT NULL CHECK (category IN (
                                      'sales','procurement','operations','finance',
                                      'hr','support','compliance','logistics','other'
                                    )),
  is_primary          boolean       NOT NULL DEFAULT false,
  status              text          NOT NULL DEFAULT 'active',
  version             integer       NOT NULL DEFAULT 1,
  source_system       text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  created_by          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT dept_resp_code_business_unique UNIQUE (business_id, department_id, responsibility_code)
);

-- ── business_operations.role_assignments ─────────────────────────────────────
-- Links platform.employees to named operational roles within BO.

CREATE TABLE business_operations.role_assignments (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id   uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id    uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  employee_id    uuid          NOT NULL REFERENCES platform.employees(id)   ON DELETE RESTRICT,
  role_code      text          NOT NULL,
  role_name      text          NOT NULL,
  role_category  text          NOT NULL CHECK (role_category IN (
                                 'account_manager','procurement_officer','operations_manager',
                                 'finance_controller','hr_manager','support_agent',
                                 'compliance_officer','warehouse_manager','other'
                               )),
  valid_from     date          NOT NULL DEFAULT CURRENT_DATE,
  valid_to       date,
  is_primary     boolean       NOT NULL DEFAULT false,
  status         text          NOT NULL DEFAULT 'active',
  version        integer       NOT NULL DEFAULT 1,
  source_system  text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  created_by     uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT role_assignments_period_check CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

INSERT INTO _migrations (filename) VALUES ('0023_create_bo_core_profile.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
