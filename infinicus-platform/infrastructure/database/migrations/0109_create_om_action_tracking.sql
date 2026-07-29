-- Migration: 0109_create_om_action_tracking
-- Stage 2I — Outcome Monitoring: action tracking (Group C)

BEGIN;

CREATE TABLE outcome_monitoring.monitored_actions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitoring_plan_id  uuid          NOT NULL REFERENCES outcome_monitoring.monitoring_plans(id) ON DELETE RESTRICT,
  approved_action_id  uuid          NOT NULL REFERENCES approved_business_action.approved_actions(id) ON DELETE RESTRICT,
  action_code         text          NOT NULL,
  status              text          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  latest_version      integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT monitored_actions_code_unique UNIQUE (business_id, action_code)
);

COMMENT ON TABLE outcome_monitoring.monitored_actions IS
  'The canonical approved action being monitored. References the ABA approved action directly — never duplicates it.';
CREATE TABLE outcome_monitoring.monitored_action_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitored_action_id  uuid         NOT NULL REFERENCES outcome_monitoring.monitored_actions(id) ON DELETE RESTRICT,
  version_number       integer      NOT NULL,
  description          text         NOT NULL,
  correlation_id       uuid         NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT monitored_action_versions_unique UNIQUE (monitored_action_id, version_number)
);

COMMENT ON TABLE outcome_monitoring.monitored_action_versions IS
  'Append-only. Historical monitored action description versions.';
CREATE TABLE outcome_monitoring.monitored_action_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitored_action_id  uuid         NOT NULL REFERENCES outcome_monitoring.monitored_actions(id) ON DELETE RESTRICT,
  from_status          text,
  to_status            text         NOT NULL CHECK (to_status IN ('pending','in_progress','completed','cancelled')),
  reason               text,
  correlation_id       uuid         NOT NULL DEFAULT gen_random_uuid(),
  occurred_at          timestamptz  NOT NULL DEFAULT now(),
  created_at           timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.monitored_action_status_history IS
  'Append-only audit trail of monitored action lifecycle transitions.';
CREATE TABLE outcome_monitoring.action_execution_observations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitored_action_version_id  uuid  NOT NULL REFERENCES outcome_monitoring.monitored_action_versions(id) ON DELETE RESTRICT,
  observed_at          timestamptz  NOT NULL DEFAULT now(),
  detail               jsonb        NOT NULL DEFAULT '{}',
  created_at           timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.action_execution_observations IS
  'Append-only. Records what was observed about the execution status of a monitored action — never itself a record of having executed anything. Execution authority is not held by this database stage.';

INSERT INTO _migrations (filename) VALUES ('0109_create_om_action_tracking.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
