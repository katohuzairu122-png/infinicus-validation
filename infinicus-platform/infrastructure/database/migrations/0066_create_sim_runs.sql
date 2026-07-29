-- Migration: 0066_create_sim_runs
-- Stage 2F — Simulation: run lifecycle (Group D)

BEGIN;

CREATE TABLE simulation.simulation_requests (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  scenario_version_id uuid         NOT NULL REFERENCES simulation.simulation_scenario_versions(id) ON DELETE RESTRICT,
  request_code      text          NOT NULL,
  requested_by      uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  idempotency_key   text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_requests_idempotency_unique UNIQUE (business_id, idempotency_key)
);

COMMENT ON TABLE simulation.simulation_requests IS
  'A request to execute a Monte Carlo run for a scenario version. Idempotent per (business_id, idempotency_key).';

CREATE TABLE simulation.simulation_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  request_id        uuid          NOT NULL REFERENCES simulation.simulation_requests(id) ON DELETE RESTRICT,
  model_version_id  uuid          NOT NULL REFERENCES simulation.simulation_model_versions(id) ON DELETE RESTRICT,
  run_code          text          NOT NULL,
  status            text          NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  sample_size       integer       NOT NULL DEFAULT 500 CHECK (sample_size >= 1),
  horizon_days      integer       NOT NULL DEFAULT 90 CHECK (horizon_days >= 1),
  engine_version    text,
  random_seed       text,
  input_fingerprint text,
  failure_code      text,
  failure_message   text,
  started_at        timestamptz,
  completed_at      timestamptz,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_runs_code_unique UNIQUE (business_id, run_code)
);

COMMENT ON TABLE simulation.simulation_runs IS
  'A Monte Carlo simulation run. Defaults preserve Engine v3 semantics: 500 iterations, 90-day horizon.';

CREATE TABLE simulation.simulation_run_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  from_status       text,
  to_status         text          NOT NULL CHECK (to_status IN ('queued','running','completed','failed','cancelled')),
  reason            text,
  actor_id          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id    uuid          NOT NULL,
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_run_status_history IS
  'Append-only audit trail of run lifecycle transitions.';

CREATE TABLE simulation.simulation_run_inputs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  run_id            uuid          NOT NULL REFERENCES simulation.simulation_runs(id) ON DELETE RESTRICT,
  parameter_code    text          NOT NULL,
  input_value       jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_run_inputs IS
  'Append-only. Exact engine inputs a run was executed with, kept for lineage.';

INSERT INTO _migrations (filename) VALUES ('0066_create_sim_runs.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
