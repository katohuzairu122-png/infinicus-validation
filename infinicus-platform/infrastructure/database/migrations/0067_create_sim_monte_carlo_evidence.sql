-- Migration: 0067_create_sim_monte_carlo_evidence
-- Stage 2F — Simulation: Monte Carlo evidence (Group E)

BEGIN;

CREATE TABLE simulation.simulation_iterations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  iteration_number  integer       NOT NULL CHECK (iteration_number >= 1),
  outcome_value     numeric       NOT NULL,
  metric_code       text          NOT NULL DEFAULT 'final_cash',
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_iterations_unique UNIQUE (run_id, metric_code, iteration_number)
);

COMMENT ON TABLE simulation.simulation_iterations IS
  'Append-only. Individual Monte Carlo iteration outcomes (raw evidence, not aggregated).';

CREATE TABLE simulation.simulation_iteration_summaries (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  metric_code       text          NOT NULL,
  sample_size       integer       NOT NULL CHECK (sample_size >= 1),
  mean_value        numeric,
  stddev_value      numeric,
  min_value         numeric,
  max_value         numeric,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_iteration_summaries_unique UNIQUE (run_id, metric_code)
);

COMMENT ON TABLE simulation.simulation_iteration_summaries IS
  'Append-only. Aggregated iteration statistics per metric for a run.';

CREATE TABLE simulation.simulation_distributions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  metric_code       text          NOT NULL,
  distribution_type text          NOT NULL CHECK (distribution_type IN (
                                     'fixed','uniform','normal','lognormal','triangular','beta','empirical','categorical'
                                   )),
  parameters        jsonb         NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_distributions IS
  'Append-only. Fitted or assigned output distribution for a run metric.';

CREATE TABLE simulation.simulation_percentiles (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  metric_code       text          NOT NULL,
  basis             text          NOT NULL DEFAULT 'final_cash',
  currency_code     text,
  p10               numeric       NOT NULL,
  p25               numeric       NOT NULL,
  p50               numeric       NOT NULL,
  p75               numeric       NOT NULL,
  p90               numeric       NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_percentiles_unique UNIQUE (run_id, metric_code)
);

COMMENT ON TABLE simulation.simulation_percentiles IS
  'Append-only. Percentile evidence exactly as produced by the engine (p10/p25/p50/p75/p90).';

INSERT INTO _migrations (filename) VALUES ('0067_create_sim_monte_carlo_evidence.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
