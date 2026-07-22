-- Migration: 0103_create_aba_registry
-- Stage 2H — Approved Business Action: registry and deployment (Group L)

BEGIN;

CREATE TABLE approved_business_action.aba_component_registry (
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
  CONSTRAINT aba_component_registry_code_unique UNIQUE (business_id, component_code)
);

COMMENT ON TABLE approved_business_action.aba_component_registry IS
  'Registry of deployable ABA workflow components.';
CREATE TABLE approved_business_action.aba_component_registry_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  aba_component_registry_id  uuid   NOT NULL REFERENCES approved_business_action.aba_component_registry(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  capabilities      jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT aba_component_registry_versions_unique UNIQUE (aba_component_registry_id, version_number)
);

COMMENT ON TABLE approved_business_action.aba_component_registry_versions IS
  'Append-only. Historical component capability versions.';
CREATE TABLE approved_business_action.aba_deployments (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  aba_component_registry_version_id  uuid   NOT NULL REFERENCES approved_business_action.aba_component_registry_versions(id) ON DELETE RESTRICT,
  environment       text          NOT NULL DEFAULT 'staging',
  activation_state  text          NOT NULL DEFAULT 'pending' CHECK (activation_state IN ('pending','active','rolled_back','superseded')),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.aba_deployments IS
  'A deployment of an ABA component registry version to an environment.';
CREATE TABLE approved_business_action.aba_deployment_rollbacks (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  aba_deployment_id  uuid          NOT NULL REFERENCES approved_business_action.aba_deployments(id) ON DELETE RESTRICT,
  reason             text          NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.aba_deployment_rollbacks IS
  'Append-only. Deployment rollback history.';

INSERT INTO _migrations (filename) VALUES ('0103_create_aba_registry.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
