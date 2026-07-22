-- Migration: 0054_create_dt_entities
-- Stage 2E — Business Digital Twin: entities and relationships (Group F)

BEGIN;

CREATE TABLE business_digital_twin.twin_entities (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  entity_code       text          NOT NULL,
  entity_type       text          NOT NULL CHECK (entity_type IN (
                                     'customer','product','location','channel','resource','team','supplier','other'
                                   )),
  name              text          NOT NULL,
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  effective_start   timestamptz   NOT NULL DEFAULT now(),
  effective_end     timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_entities_code_unique UNIQUE (instance_id, entity_code),
  CONSTRAINT twin_entities_effective_check CHECK (effective_end IS NULL OR effective_end > effective_start)
);

COMMENT ON TABLE business_digital_twin.twin_entities IS
  'Governed business entity within a twin instance (customer, product, location, channel, resource, team, supplier, other).';

CREATE TABLE business_digital_twin.twin_entity_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  entity_id         uuid          NOT NULL REFERENCES business_digital_twin.twin_entities(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  attributes        jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_entity_versions_unique UNIQUE (entity_id, version_number)
);

COMMENT ON TABLE business_digital_twin.twin_entity_versions IS
  'Append-only. Historical entity attribute versions.';

CREATE TABLE business_digital_twin.twin_relationships (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  from_entity_id    uuid          NOT NULL REFERENCES business_digital_twin.twin_entities(id) ON DELETE RESTRICT,
  to_entity_id      uuid          NOT NULL REFERENCES business_digital_twin.twin_entities(id) ON DELETE RESTRICT,
  relationship_type text          NOT NULL,
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  effective_start   timestamptz   NOT NULL DEFAULT now(),
  effective_end     timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_relationships_effective_check CHECK (effective_end IS NULL OR effective_end > effective_start)
);

COMMENT ON TABLE business_digital_twin.twin_relationships IS
  'Directed relationship between two governed entities, effective-dated.';

CREATE TABLE business_digital_twin.twin_relationship_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  relationship_id   uuid          NOT NULL REFERENCES business_digital_twin.twin_relationships(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  attributes        jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_relationship_versions_unique UNIQUE (relationship_id, version_number)
);

COMMENT ON TABLE business_digital_twin.twin_relationship_versions IS
  'Append-only. Historical relationship attribute versions.';

INSERT INTO _migrations (filename) VALUES ('0054_create_dt_entities.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
