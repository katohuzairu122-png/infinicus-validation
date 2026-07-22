-- Migration: 0056_create_dt_calibration_validation
-- Stage 2E — Business Digital Twin: calibration and validation (Group H)

BEGIN;

CREATE TABLE business_digital_twin.twin_calibration_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  status            text          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','running','completed','failed','cancelled')),
  requested_by      uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_calibration_runs IS
  'A calibration run for a twin instance against observed evidence.';

CREATE TABLE business_digital_twin.twin_calibration_inputs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  calibration_run_id uuid         NOT NULL REFERENCES business_digital_twin.twin_calibration_runs(id) ON DELETE RESTRICT,
  state_variable_definition_id uuid REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE SET NULL,
  input_reference   jsonb         NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_calibration_inputs IS
  'Append-only. Inputs supplied to a calibration run.';

CREATE TABLE business_digital_twin.twin_calibration_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  calibration_run_id uuid         NOT NULL REFERENCES business_digital_twin.twin_calibration_runs(id) ON DELETE RESTRICT,
  state_variable_definition_id uuid REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE SET NULL,
  adjusted_value    jsonb,
  delta             numeric,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_calibration_results IS
  'Append-only. Completed calibration results are immutable evidence.';

CREATE TABLE business_digital_twin.twin_validation_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  snapshot_version_id uuid        REFERENCES business_digital_twin.digital_twin_snapshot_versions(id) ON DELETE SET NULL,
  status            text          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','running','completed','failed','cancelled')),
  outcome           text          CHECK (outcome IS NULL OR outcome IN ('passed','passed_with_warnings','failed')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_validation_runs IS
  'A validation run confirming twin structural and referential integrity.';

CREATE TABLE business_digital_twin.twin_validation_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  validation_run_id uuid          NOT NULL REFERENCES business_digital_twin.twin_validation_runs(id) ON DELETE RESTRICT,
  outcome           text          NOT NULL CHECK (outcome IN ('passed','passed_with_warnings','failed')),
  summary           text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_validation_results IS
  'Append-only. Completed validation evidence is immutable.';

CREATE TABLE business_digital_twin.twin_validation_issues (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  validation_run_id uuid          NOT NULL REFERENCES business_digital_twin.twin_validation_runs(id) ON DELETE RESTRICT,
  severity          text          NOT NULL CHECK (severity IN ('info','warning','error')),
  issue_code        text          NOT NULL,
  message           text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_validation_issues IS
  'Append-only. Individual validation issues raised by a validation run.';

INSERT INTO _migrations (filename) VALUES ('0056_create_dt_calibration_validation.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
