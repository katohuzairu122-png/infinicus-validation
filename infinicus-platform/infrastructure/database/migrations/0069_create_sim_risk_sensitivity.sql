-- Migration: 0069_create_sim_risk_sensitivity
-- Stage 2F — Simulation: risk and sensitivity (Group G)

BEGIN;

CREATE TABLE simulation.simulation_risk_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  survival_rate     numeric(5,4)  NOT NULL CHECK (survival_rate BETWEEN 0 AND 1),
  downside_p10      numeric       NOT NULL,
  basis             text          NOT NULL DEFAULT 'final_cash',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_risk_results IS
  'Append-only. Risk evidence carried verbatim from the engine distribution.';

CREATE TABLE simulation.simulation_sensitivity_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_version_id uuid         NOT NULL REFERENCES simulation.simulation_scenario_versions(id) ON DELETE RESTRICT,
  status            text          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','running','completed','failed','cancelled')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_sensitivity_runs IS
  'A sensitivity analysis run over a scenario version drivers.';

CREATE TABLE simulation.simulation_sensitivity_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  sensitivity_run_id uuid         NOT NULL REFERENCES simulation.simulation_sensitivity_runs(id) ON DELETE RESTRICT,
  driver             text         NOT NULL,
  metric_code         text        NOT NULL,
  delta               numeric     NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_sensitivity_results IS
  'Append-only. Completed sensitivity evidence is immutable.';

CREATE TABLE simulation.simulation_failure_modes (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  failure_code      text          NOT NULL,
  description       text          NOT NULL,
  likelihood        numeric(5,4)  CHECK (likelihood IS NULL OR (likelihood BETWEEN 0 AND 1)),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_failure_modes IS
  'Append-only. Identified failure modes surfaced by a run outcome distribution.';

INSERT INTO _migrations (filename) VALUES ('0069_create_sim_risk_sensitivity.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
