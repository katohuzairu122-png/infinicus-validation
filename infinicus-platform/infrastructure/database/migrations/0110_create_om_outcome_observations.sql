-- Migration: 0110_create_om_outcome_observations
-- Stage 2I — Outcome Monitoring: outcome observations (Group D)

BEGIN;

CREATE TABLE outcome_monitoring.outcome_observations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitored_action_id  uuid         NOT NULL REFERENCES outcome_monitoring.monitored_actions(id) ON DELETE RESTRICT,
  observation_code     text         NOT NULL,
  status               text         NOT NULL DEFAULT 'draft' CHECK (status IN (
                                        'draft','recorded','verified','disputed','superseded'
                                      )),
  latest_version       integer      NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT outcome_observations_code_unique UNIQUE (business_id, observation_code)
);

COMMENT ON TABLE outcome_monitoring.outcome_observations IS
  'A governed observed outcome. This is where OM exercises its observation authority — the observation, once recorded, verified, or disputed, is permanently immutable. Observed outcomes are preserved separately from expected outcomes and are never a silent rewrite of an earlier decision.';
CREATE TABLE outcome_monitoring.outcome_observation_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  observation_id    uuid          NOT NULL REFERENCES outcome_monitoring.outcome_observations(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  summary           text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN (
                                      'draft','recorded','verified','disputed','superseded'
                                    )),
  effective_at      timestamptz   NOT NULL,
  recorded_at       timestamptz   NOT NULL DEFAULT now(),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT outcome_observation_versions_unique UNIQUE (observation_id, version_number)
);

COMMENT ON TABLE outcome_monitoring.outcome_observation_versions IS
  'Append-only. Recorded/verified/disputed observation versions are immutable — see enforce_observation_version_immutability.';
CREATE TABLE outcome_monitoring.outcome_measurements (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  observation_version_id  uuid   NOT NULL REFERENCES outcome_monitoring.outcome_observation_versions(id) ON DELETE RESTRICT,
  metric_code       text          NOT NULL,
  measured_value    jsonb         NOT NULL,
  unit              text,
  measured_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_measurements IS
  'Append-only. Individual metric measurements backing an observation version.';
CREATE TABLE outcome_monitoring.outcome_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  observation_version_id  uuid   NOT NULL REFERENCES outcome_monitoring.outcome_observation_versions(id) ON DELETE RESTRICT,
  evidence_type     text          NOT NULL CHECK (evidence_type IN (
                                      'execution_record','external_system','manual_entry','other'
                                    )),
  evidence_reference jsonb        NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_evidence IS
  'Append-only. Never fabricates evidence — only records a reference.';

INSERT INTO _migrations (filename) VALUES ('0110_create_om_outcome_observations.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
