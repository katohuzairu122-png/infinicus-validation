-- Migration: 0068_create_sim_results
-- Stage 2F — Simulation: results (Group F)

BEGIN;

CREATE TABLE simulation.simulation_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  result_code       text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','superseded','rejected')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_results_code_unique UNIQUE (business_id, result_code)
);

COMMENT ON TABLE simulation.simulation_results IS
  'Canonical result container for a completed run. Published results are immutable.';

CREATE TABLE simulation.simulation_result_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  result_id         uuid          NOT NULL REFERENCES simulation.simulation_results(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  summary           text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','superseded','rejected')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_result_versions_unique UNIQUE (result_id, version_number)
);

COMMENT ON TABLE simulation.simulation_result_versions IS
  'Append-only. Published result versions are immutable — see enforce_result_version_immutability.';

CREATE TABLE simulation.simulation_result_metrics (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  result_version_id uuid          NOT NULL REFERENCES simulation.simulation_result_versions(id) ON DELETE RESTRICT,
  metric_code       text          NOT NULL,
  value_json        jsonb         NOT NULL,
  unit              text,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_result_metrics IS
  'Append-only. Normalized outcome metrics captured for a result version.';

CREATE TABLE simulation.simulation_result_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  result_version_id uuid          NOT NULL REFERENCES simulation.simulation_result_versions(id) ON DELETE RESTRICT,
  evidence_type     text          NOT NULL,
  evidence_reference jsonb        NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_result_evidence IS
  'Append-only. Supporting evidence (iterations, distributions, percentiles) backing a result version.';

INSERT INTO _migrations (filename) VALUES ('0068_create_sim_results.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
