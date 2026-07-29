-- Migration: 0127_create_cl_model_evaluation
-- Stage 2J — Continuous Learning: model evaluation (Group F)

BEGIN;

CREATE TABLE continuous_learning.model_evaluation_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          REFERENCES continuous_learning.learning_cases(id) ON DELETE SET NULL,
  model_code         text          NOT NULL,
  status             text          NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  requested_at       timestamptz   NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.model_evaluation_runs IS
  'A run evaluating a governed model against learning evidence.';
CREATE TABLE continuous_learning.model_evaluation_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evaluation_run_id  uuid          NOT NULL REFERENCES continuous_learning.model_evaluation_runs(id) ON DELETE RESTRICT,
  metric_code        text          NOT NULL,
  metric_value       jsonb         NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.model_evaluation_results IS
  'Append-only. Per-metric model evaluation results.';
CREATE TABLE continuous_learning.model_drift_records (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evaluation_run_id  uuid          NOT NULL REFERENCES continuous_learning.model_evaluation_runs(id) ON DELETE RESTRICT,
  drift_type         text          NOT NULL,
  magnitude          numeric(10,6) NOT NULL,
  detected_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.model_drift_records IS
  'Append-only. Detected model drift, permanent record.';
CREATE TABLE continuous_learning.model_bias_records (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evaluation_run_id  uuid          NOT NULL REFERENCES continuous_learning.model_evaluation_runs(id) ON DELETE RESTRICT,
  bias_type          text          NOT NULL,
  magnitude          numeric(10,6) NOT NULL,
  detected_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.model_bias_records IS
  'Append-only. Detected model bias, permanent record.';

INSERT INTO _migrations (filename) VALUES ('0127_create_cl_model_evaluation.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
