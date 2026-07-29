-- Migration: 0059_create_dt_publication_registry
-- Stage 2E — Business Digital Twin: publication (Group K) and registry/deployment (Group L)

BEGIN;

CREATE TABLE business_digital_twin.dt_insight_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  package_code      text          NOT NULL,
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','revoked')),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_insight_packages_code_unique UNIQUE (business_id, package_code)
);

COMMENT ON TABLE business_digital_twin.dt_insight_packages IS
  'Packaged DT snapshots and scenario baselines prepared for downstream publication.';

CREATE TABLE business_digital_twin.dt_insight_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dt_insight_package_id uuid      NOT NULL REFERENCES business_digital_twin.dt_insight_packages(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  snapshot_version_id uuid        REFERENCES business_digital_twin.digital_twin_snapshot_versions(id) ON DELETE SET NULL,
  scenario_baseline_version_id uuid REFERENCES business_digital_twin.scenario_baseline_versions(id) ON DELETE SET NULL,
  summary           text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_insight_package_versions_unique UNIQUE (dt_insight_package_id, version_number)
);

COMMENT ON TABLE business_digital_twin.dt_insight_package_versions IS
  'Append-only. Historical insight-package versions.';

CREATE TABLE business_digital_twin.dt_publication_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dt_insight_package_version_id uuid NOT NULL REFERENCES business_digital_twin.dt_insight_package_versions(id) ON DELETE RESTRICT,
  target_layer      text          NOT NULL CHECK (target_layer IN ('simulation')),
  target_block      text          NOT NULL,
  publication_status text         NOT NULL DEFAULT 'draft' CHECK (publication_status IN (
                                     'draft','ready','dispatched','acknowledged','rejected','revoked'
                                   )),
  idempotency_key   text          NOT NULL,
  dispatched_at     timestamptz,
  acknowledged_at   timestamptz,
  rejected_at       timestamptz,
  rejection_reason  text,
  revoked_at        timestamptz,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_publication_packages_idempotency_unique UNIQUE (business_id, idempotency_key)
);

COMMENT ON TABLE business_digital_twin.dt_publication_packages IS
  'Declares publication to Simulation (the only authorized downstream layer for DT). Persists declaration and lifecycle only.';

CREATE TABLE business_digital_twin.dt_publication_events (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dt_publication_package_id uuid  NOT NULL REFERENCES business_digital_twin.dt_publication_packages(id) ON DELETE RESTRICT,
  event_type        text          NOT NULL CHECK (event_type IN ('dispatch','acknowledgement','rejection','revocation','replay')),
  detail            jsonb         NOT NULL DEFAULT '{}',
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.dt_publication_events IS
  'Append-only. Publication lifecycle event log.';

CREATE TABLE business_digital_twin.dt_component_registry (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  component_code    text          NOT NULL,
  component_type    text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_component_registry_code_unique UNIQUE (business_id, component_code)
);

COMMENT ON TABLE business_digital_twin.dt_component_registry IS
  'Registry of deployable DT components and models.';

CREATE TABLE business_digital_twin.dt_component_registry_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dt_component_registry_id uuid   NOT NULL REFERENCES business_digital_twin.dt_component_registry(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  capabilities      jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_component_registry_versions_unique UNIQUE (dt_component_registry_id, version_number)
);

COMMENT ON TABLE business_digital_twin.dt_component_registry_versions IS
  'Append-only. Historical component capability/interface versions.';

CREATE TABLE business_digital_twin.dt_deployments (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dt_component_registry_version_id uuid NOT NULL REFERENCES business_digital_twin.dt_component_registry_versions(id) ON DELETE RESTRICT,
  activation_state  text          NOT NULL DEFAULT 'pending' CHECK (activation_state IN ('pending','active','rolled_back','superseded')),
  environment       text          NOT NULL DEFAULT 'staging',
  deployed_at       timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.dt_deployments IS
  'Deployment record for a registered DT component version.';

CREATE TABLE business_digital_twin.dt_deployment_rollbacks (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dt_deployment_id  uuid          NOT NULL REFERENCES business_digital_twin.dt_deployments(id) ON DELETE RESTRICT,
  reason            text          NOT NULL,
  rolled_back_at    timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.dt_deployment_rollbacks IS
  'Append-only. Deployment rollback history.';

INSERT INTO _migrations (filename) VALUES ('0059_create_dt_publication_registry.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
