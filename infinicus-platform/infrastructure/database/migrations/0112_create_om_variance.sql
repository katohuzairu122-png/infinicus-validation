-- Migration: 0112_create_om_variance
-- Stage 2I — Outcome Monitoring: variance (Group F)

BEGIN;

CREATE TABLE outcome_monitoring.outcome_variance_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  target_id          uuid          NOT NULL REFERENCES outcome_monitoring.outcome_targets(id) ON DELETE RESTRICT,
  status             text          NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  requested_at       timestamptz   NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_variance_runs IS
  'A run comparing observed outcomes against expected targets.';
CREATE TABLE outcome_monitoring.outcome_variance_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  variance_run_id    uuid          NOT NULL REFERENCES outcome_monitoring.outcome_variance_runs(id) ON DELETE RESTRICT,
  metric_code        text          NOT NULL,
  variance_value     jsonb         NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_variance_results IS
  'Append-only. Per-metric variance results from a variance run.';
CREATE TABLE outcome_monitoring.expected_actual_comparisons (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  variance_run_id    uuid          NOT NULL REFERENCES outcome_monitoring.outcome_variance_runs(id) ON DELETE RESTRICT,
  metric_code        text          NOT NULL,
  expected_value     jsonb         NOT NULL,
  actual_value       jsonb         NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.expected_actual_comparisons IS
  'Append-only. Paired expected-vs-actual comparison records.';
CREATE TABLE outcome_monitoring.variance_explanations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  variance_result_id  uuid         NOT NULL REFERENCES outcome_monitoring.outcome_variance_results(id) ON DELETE RESTRICT,
  explanation_code    text         NOT NULL,
  statement           text         NOT NULL,
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.variance_explanations IS
  'Append-only. Structured explanation of a variance result.';

INSERT INTO _migrations (filename) VALUES ('0112_create_om_variance.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
