-- Migration: 0113_create_om_alerts_incidents
-- Stage 2I — Outcome Monitoring: alerts and incidents (Group G)

BEGIN;

CREATE TABLE outcome_monitoring.monitoring_alert_rules (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitoring_plan_id  uuid          NOT NULL REFERENCES outcome_monitoring.monitoring_plans(id) ON DELETE RESTRICT,
  rule_code           text          NOT NULL,
  status              text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  latest_version      integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_alert_rules_code_unique UNIQUE (business_id, rule_code)
);

COMMENT ON TABLE outcome_monitoring.monitoring_alert_rules IS
  'A rule that triggers a monitoring alert when its condition is met.';
CREATE TABLE outcome_monitoring.monitoring_alert_rule_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  alert_rule_id      uuid          NOT NULL REFERENCES outcome_monitoring.monitoring_alert_rules(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  condition          jsonb         NOT NULL,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_alert_rule_versions_unique UNIQUE (alert_rule_id, version_number)
);

COMMENT ON TABLE outcome_monitoring.monitoring_alert_rule_versions IS
  'Append-only. Historical alert rule condition versions.';
CREATE TABLE outcome_monitoring.monitoring_alerts (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  alert_rule_version_id  uuid       NOT NULL REFERENCES outcome_monitoring.monitoring_alert_rule_versions(id) ON DELETE RESTRICT,
  observation_id     uuid          REFERENCES outcome_monitoring.outcome_observations(id) ON DELETE SET NULL,
  status             text          NOT NULL DEFAULT 'raised' CHECK (status IN ('raised','acknowledged','resolved','suppressed')),
  raised_at          timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.monitoring_alerts IS
  'A raised alert instance from an alert rule version.';
CREATE TABLE outcome_monitoring.monitoring_incidents (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitoring_alert_id  uuid         NOT NULL REFERENCES outcome_monitoring.monitoring_alerts(id) ON DELETE RESTRICT,
  status               text         NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  opened_at            timestamptz  NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.monitoring_incidents IS
  'An incident opened from a monitoring alert requiring investigation.';

INSERT INTO _migrations (filename) VALUES ('0113_create_om_alerts_incidents.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
