-- Migration: 0108_create_om_monitoring_plans
-- Stage 2I — Outcome Monitoring: monitoring plans (Group B)

BEGIN;

CREATE TABLE outcome_monitoring.monitoring_plans (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id  uuid          NOT NULL REFERENCES outcome_monitoring.om_intake_packages(id) ON DELETE RESTRICT,
  plan_code          text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_plans_code_unique UNIQUE (business_id, plan_code)
);

COMMENT ON TABLE outcome_monitoring.monitoring_plans IS
  'A governed plan for observing the outcomes of an approved action, built from an accepted ABA publication intake.';
CREATE TABLE outcome_monitoring.monitoring_plan_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  plan_id            uuid          NOT NULL REFERENCES outcome_monitoring.monitoring_plans(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  summary            text          NOT NULL,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_plan_versions_unique UNIQUE (plan_id, version_number)
);

COMMENT ON TABLE outcome_monitoring.monitoring_plan_versions IS
  'Append-only. Historical monitoring plan summary versions.';
CREATE TABLE outcome_monitoring.monitoring_plan_metrics (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  plan_version_id    uuid          NOT NULL REFERENCES outcome_monitoring.monitoring_plan_versions(id) ON DELETE RESTRICT,
  metric_code        text          NOT NULL,
  metric_type        text          NOT NULL,
  target_value       jsonb,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.monitoring_plan_metrics IS
  'Append-only. Named metrics a monitoring plan version tracks.';
CREATE TABLE outcome_monitoring.monitoring_plan_schedules (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  plan_version_id    uuid          NOT NULL REFERENCES outcome_monitoring.monitoring_plan_versions(id) ON DELETE RESTRICT,
  schedule_type      text          NOT NULL CHECK (schedule_type IN ('one_time','recurring')),
  cadence            text,
  starts_at          timestamptz   NOT NULL,
  ends_at            timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.monitoring_plan_schedules IS
  'Append-only. Declared observation schedule for a monitoring plan version.';

INSERT INTO _migrations (filename) VALUES ('0108_create_om_monitoring_plans.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
