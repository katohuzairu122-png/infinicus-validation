-- Migration: 0070_create_sim_comparisons
-- Stage 2F — Simulation: comparisons (Group H)

BEGIN;

CREATE TABLE simulation.scenario_comparison_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  comparison_code   text          NOT NULL,
  objective         text          NOT NULL,
  status            text          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','running','completed','failed','cancelled')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT scenario_comparison_runs_code_unique UNIQUE (business_id, comparison_code)
);

COMMENT ON TABLE simulation.scenario_comparison_runs IS
  'A run comparing outcomes across multiple scenarios/runs.';

CREATE TABLE simulation.scenario_comparison_members (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  comparison_run_id uuid          NOT NULL REFERENCES simulation.scenario_comparison_runs(id) ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  label             text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT scenario_comparison_members_unique UNIQUE (comparison_run_id, run_id)
);

COMMENT ON TABLE simulation.scenario_comparison_members IS
  'Append-only. Member runs included in a scenario comparison.';

CREATE TABLE simulation.scenario_comparison_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  comparison_run_id uuid          NOT NULL REFERENCES simulation.scenario_comparison_runs(id) ON DELETE RESTRICT,
  metric_code       text          NOT NULL,
  result_json       jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.scenario_comparison_results IS
  'Append-only. Completed comparison evidence is immutable.';

INSERT INTO _migrations (filename) VALUES ('0070_create_sim_comparisons.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
