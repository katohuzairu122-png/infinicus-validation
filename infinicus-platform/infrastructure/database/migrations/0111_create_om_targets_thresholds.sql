-- Migration: 0111_create_om_targets_thresholds
-- Stage 2I — Outcome Monitoring: targets and thresholds (Group E)

BEGIN;

CREATE TABLE outcome_monitoring.outcome_targets (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitoring_plan_id  uuid          NOT NULL REFERENCES outcome_monitoring.monitoring_plans(id) ON DELETE RESTRICT,
  target_code         text          NOT NULL,
  status              text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  latest_version      integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT outcome_targets_code_unique UNIQUE (business_id, target_code)
);

COMMENT ON TABLE outcome_monitoring.outcome_targets IS
  'The expected outcome target a monitoring plan measures observations against.';
CREATE TABLE outcome_monitoring.outcome_target_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  target_id         uuid          NOT NULL REFERENCES outcome_monitoring.outcome_targets(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  specification     jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT outcome_target_versions_unique UNIQUE (target_id, version_number)
);

COMMENT ON TABLE outcome_monitoring.outcome_target_versions IS
  'Append-only. Historical target specification versions.';
CREATE TABLE outcome_monitoring.outcome_thresholds (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  target_version_id  uuid          NOT NULL REFERENCES outcome_monitoring.outcome_target_versions(id) ON DELETE RESTRICT,
  threshold_code     text          NOT NULL,
  operator           text          NOT NULL CHECK (operator IN (
                                       'eq','neq','lt','lte','gt','gte','between','in','not_in','contains'
                                     )),
  operand            jsonb         NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_thresholds IS
  'Append-only. Named threshold rules evaluated against observations.';
CREATE TABLE outcome_monitoring.threshold_breaches (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  threshold_id       uuid          NOT NULL REFERENCES outcome_monitoring.outcome_thresholds(id) ON DELETE RESTRICT,
  observation_id     uuid          NOT NULL REFERENCES outcome_monitoring.outcome_observations(id) ON DELETE RESTRICT,
  breached_at        timestamptz   NOT NULL DEFAULT now(),
  detail             jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.threshold_breaches IS
  'Append-only. Permanent record of a threshold breach detected against an observation.';

INSERT INTO _migrations (filename) VALUES ('0111_create_om_targets_thresholds.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
