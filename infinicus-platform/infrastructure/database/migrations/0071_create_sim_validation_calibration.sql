-- Migration: 0071_create_sim_validation_calibration
-- Stage 2F — Simulation: validation and calibration (Group I)

BEGIN;

CREATE TABLE simulation.simulation_validation_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_version_id  uuid          NOT NULL REFERENCES simulation.simulation_model_versions(id) ON DELETE RESTRICT,
  status            text          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','running','completed','failed','cancelled')),
  outcome           text          CHECK (outcome IS NULL OR outcome IN ('passed','passed_with_warnings','failed')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_validation_runs IS
  'A validation run confirming a model version structural and referential integrity.';

CREATE TABLE simulation.simulation_validation_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  validation_run_id uuid          NOT NULL REFERENCES simulation.simulation_validation_runs(id) ON DELETE RESTRICT,
  outcome           text          NOT NULL CHECK (outcome IN ('passed','passed_with_warnings','failed')),
  summary           text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_validation_results IS
  'Append-only. Completed validation evidence is immutable.';

CREATE TABLE simulation.simulation_calibration_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_version_id  uuid          NOT NULL REFERENCES simulation.simulation_model_versions(id) ON DELETE RESTRICT,
  status            text          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','running','completed','failed','cancelled')),
  requested_by      uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_calibration_runs IS
  'A calibration run for a model version against observed evidence.';

CREATE TABLE simulation.simulation_calibration_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  calibration_run_id uuid         NOT NULL REFERENCES simulation.simulation_calibration_runs(id) ON DELETE RESTRICT,
  parameter_code    text          NOT NULL,
  adjusted_value    jsonb,
  delta             numeric,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_calibration_results IS
  'Append-only. Completed calibration results are immutable evidence.';

INSERT INTO _migrations (filename) VALUES ('0071_create_sim_validation_calibration.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
