-- Migration: 0051_create_dt_definitions_instances
-- Stage 2E — Business Digital Twin: twin definitions (Group B) and instances (Group C)

BEGIN;

CREATE TABLE business_digital_twin.digital_twin_definitions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  definition_code  text          NOT NULL,
  name             text          NOT NULL,
  status           text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  latest_version   integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT digital_twin_definitions_code_unique UNIQUE (business_id, definition_code)
);

COMMENT ON TABLE business_digital_twin.digital_twin_definitions IS
  'Canonical structural definition of a business twin. Mutable while draft/validated; released versions are immutable.';

CREATE TABLE business_digital_twin.digital_twin_definition_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  definition_id    uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_definitions(id) ON DELETE RESTRICT,
  version_number   integer       NOT NULL,
  schema_reference jsonb         NOT NULL DEFAULT '{}',
  status           text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_definition_versions_unique UNIQUE (definition_id, version_number)
);

COMMENT ON TABLE business_digital_twin.digital_twin_definition_versions IS
  'Append-only. Active/released definition versions are immutable — see enforce_definition_version_immutability.';

CREATE TABLE business_digital_twin.digital_twin_definition_components (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  definition_version_id  uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_definition_versions(id) ON DELETE RESTRICT,
  component_code         text          NOT NULL,
  component_type         text          NOT NULL,
  specification          jsonb         NOT NULL DEFAULT '{}',
  created_at             timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.digital_twin_definition_components IS
  'Append-only. Structural components belonging to a definition version.';

CREATE TABLE business_digital_twin.digital_twin_definition_relationships (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  definition_version_id  uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_definition_versions(id) ON DELETE RESTRICT,
  from_component_code    text          NOT NULL,
  to_component_code      text          NOT NULL,
  relationship_type      text          NOT NULL,
  created_at             timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.digital_twin_definition_relationships IS
  'Append-only. Directed relationships between definition components.';

CREATE TABLE business_digital_twin.digital_twin_instances (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  definition_id     uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_definitions(id) ON DELETE RESTRICT,
  instance_code     text          NOT NULL,
  status            text          NOT NULL DEFAULT 'initializing' CHECK (status IN (
                                     'initializing','active','degraded','stale','suspended','retired','failed'
                                   )),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT digital_twin_instances_code_unique UNIQUE (business_id, instance_code)
);

COMMENT ON TABLE business_digital_twin.digital_twin_instances IS
  'Tenant/workspace/business-specific instantiation of a twin definition.';

CREATE TABLE business_digital_twin.digital_twin_instance_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  definition_version_id uuid      NOT NULL REFERENCES business_digital_twin.digital_twin_definition_versions(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_instance_versions_unique UNIQUE (instance_id, version_number)
);

COMMENT ON TABLE business_digital_twin.digital_twin_instance_versions IS
  'Append-only. Instance-to-definition-version binding history.';

CREATE TABLE business_digital_twin.digital_twin_instance_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  from_status       text,
  to_status         text          NOT NULL CHECK (to_status IN (
                                     'initializing','active','degraded','stale','suspended','retired','failed'
                                   )),
  reason            text,
  actor_id          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id    uuid          NOT NULL,
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.digital_twin_instance_status_history IS
  'Append-only audit trail of instance lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0051_create_dt_definitions_instances.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
