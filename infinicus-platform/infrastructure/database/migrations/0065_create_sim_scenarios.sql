-- Migration: 0065_create_sim_scenarios
-- Stage 2F — Simulation: scenario definitions (Group C)

BEGIN;

CREATE TABLE simulation.simulation_scenarios (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_id          uuid          NOT NULL REFERENCES simulation.simulation_models(id) ON DELETE RESTRICT,
  intake_package_id uuid          REFERENCES simulation.simulation_intake_packages(id) ON DELETE SET NULL,
  scenario_code     text          NOT NULL,
  name              text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_scenarios_code_unique UNIQUE (business_id, scenario_code)
);

COMMENT ON TABLE simulation.simulation_scenarios IS
  'Named scenario definition to be executed against a Monte Carlo model.';

CREATE TABLE simulation.simulation_scenario_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_id       uuid          NOT NULL REFERENCES simulation.simulation_scenarios(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_scenario_versions_unique UNIQUE (scenario_id, version_number)
);

COMMENT ON TABLE simulation.simulation_scenario_versions IS
  'Append-only. Historical scenario versions.';

CREATE TABLE simulation.simulation_scenario_inputs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_version_id uuid         NOT NULL REFERENCES simulation.simulation_scenario_versions(id) ON DELETE RESTRICT,
  parameter_code    text          NOT NULL,
  input_value       jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_scenario_inputs IS
  'Append-only. Parameter inputs frozen into a scenario version.';

CREATE TABLE simulation.simulation_scenario_assumptions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_version_id uuid         NOT NULL REFERENCES simulation.simulation_scenario_versions(id) ON DELETE RESTRICT,
  assumption_code   text          NOT NULL,
  statement         text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_scenario_assumptions IS
  'Append-only. Assumptions carried with a scenario version (e.g. from the DT→SIM handoff).';

CREATE TABLE simulation.simulation_scenario_constraints (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_version_id uuid         NOT NULL REFERENCES simulation.simulation_scenario_versions(id) ON DELETE RESTRICT,
  constraint_code   text          NOT NULL,
  operator          text          NOT NULL CHECK (operator IN ('eq','neq','lt','lte','gt','gte','between','in','not_in','contains')),
  operand           jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_scenario_constraints IS
  'Append-only. Constraints carried with a scenario version.';

INSERT INTO _migrations (filename) VALUES ('0065_create_sim_scenarios.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
