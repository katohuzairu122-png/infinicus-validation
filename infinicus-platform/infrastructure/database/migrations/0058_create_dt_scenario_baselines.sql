-- Migration: 0058_create_dt_scenario_baselines
-- Stage 2E — Business Digital Twin: scenario baselines (Group J)

BEGIN;

CREATE TABLE business_digital_twin.scenario_baselines (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  snapshot_version_id uuid        NOT NULL REFERENCES business_digital_twin.digital_twin_snapshot_versions(id) ON DELETE RESTRICT,
  baseline_code     text          NOT NULL,
  objective         text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','ready','published','superseded','rejected')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT scenario_baselines_code_unique UNIQUE (business_id, baseline_code)
);

COMMENT ON TABLE business_digital_twin.scenario_baselines IS
  'Governed Simulation-ready baseline derived from a snapshot version. Published baselines are immutable.';

CREATE TABLE business_digital_twin.scenario_baseline_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_baseline_id uuid       NOT NULL REFERENCES business_digital_twin.scenario_baselines(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','ready','published','superseded','rejected')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT scenario_baseline_versions_unique UNIQUE (scenario_baseline_id, version_number)
);

COMMENT ON TABLE business_digital_twin.scenario_baseline_versions IS
  'Append-only. Published scenario-baseline versions are immutable.';

CREATE TABLE business_digital_twin.scenario_baseline_inputs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_baseline_version_id uuid NOT NULL REFERENCES business_digital_twin.scenario_baseline_versions(id) ON DELETE RESTRICT,
  state_variable_definition_id uuid REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE SET NULL,
  uncertainty_assignment_id uuid   REFERENCES business_digital_twin.twin_uncertainty_assignments(id) ON DELETE SET NULL,
  input_value       jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.scenario_baseline_inputs IS
  'Append-only. Variable inputs (with uncertainty where applicable) frozen into a scenario baseline version.';

CREATE TABLE business_digital_twin.scenario_baseline_constraints (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_baseline_version_id uuid NOT NULL REFERENCES business_digital_twin.scenario_baseline_versions(id) ON DELETE RESTRICT,
  twin_constraint_id uuid         REFERENCES business_digital_twin.twin_constraints(id) ON DELETE SET NULL,
  operator          text          NOT NULL CHECK (operator IN ('eq','neq','lt','lte','gt','gte','between','in','not_in','contains')),
  operand           jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.scenario_baseline_constraints IS
  'Append-only. Constraints frozen into a scenario baseline version.';

INSERT INTO _migrations (filename) VALUES ('0058_create_dt_scenario_baselines.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
