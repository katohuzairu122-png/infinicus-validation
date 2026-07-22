-- Migration: 0098_create_aba_execution_plans
-- Stage 2H — Approved Business Action: execution plans (Group G)

BEGIN;

CREATE TABLE approved_business_action.action_execution_plans (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  approved_action_id  uuid          NOT NULL REFERENCES approved_business_action.approved_actions(id) ON DELETE RESTRICT,
  plan_code           text          NOT NULL,
  status              text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','active','completed','cancelled')),
  latest_version      integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT action_execution_plans_code_unique UNIQUE (business_id, plan_code)
);

COMMENT ON TABLE approved_business_action.action_execution_plans IS
  'A planned execution approach for an approved action. Describes the plan only — execution itself is out of scope for this database stage.';
CREATE TABLE approved_business_action.action_execution_plan_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  plan_id           uuid          NOT NULL REFERENCES approved_business_action.action_execution_plans(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  summary           text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT action_execution_plan_versions_unique UNIQUE (plan_id, version_number)
);

COMMENT ON TABLE approved_business_action.action_execution_plan_versions IS
  'Append-only. Historical execution plan summary versions.';
CREATE TABLE approved_business_action.action_execution_dependencies (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  plan_version_id     uuid        NOT NULL REFERENCES approved_business_action.action_execution_plan_versions(id) ON DELETE RESTRICT,
  depends_on_plan_id  uuid          REFERENCES approved_business_action.action_execution_plans(id) ON DELETE SET NULL,
  dependency_type     text          NOT NULL CHECK (dependency_type IN ('blocks','requires')),
  created_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.action_execution_dependencies IS
  'Append-only. Declared dependencies between execution plans.';
CREATE TABLE approved_business_action.action_execution_windows (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  plan_version_id   uuid          NOT NULL REFERENCES approved_business_action.action_execution_plan_versions(id) ON DELETE RESTRICT,
  window_type       text          NOT NULL,
  starts_at         timestamptz   NOT NULL,
  ends_at           timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.action_execution_windows IS
  'Append-only. Declared execution time windows for a plan version.';

INSERT INTO _migrations (filename) VALUES ('0098_create_aba_execution_plans.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
