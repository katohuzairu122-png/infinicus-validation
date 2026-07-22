-- Migration: 0055_create_dt_assumptions_constraints
-- Stage 2E — Business Digital Twin: assumptions and constraints (Group G)

BEGIN;

CREATE TABLE business_digital_twin.twin_assumptions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  assumption_code   text          NOT NULL,
  source            text          NOT NULL CHECK (source IN ('observed','declared','derived','inferred','external')),
  statement         text          NOT NULL,
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_assumptions_code_unique UNIQUE (instance_id, assumption_code)
);

COMMENT ON TABLE business_digital_twin.twin_assumptions IS
  'Declared, observed, derived, inferred, or external assumption governing a twin instance.';

CREATE TABLE business_digital_twin.twin_assumption_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  assumption_id     uuid          NOT NULL REFERENCES business_digital_twin.twin_assumptions(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  statement         text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_assumption_versions_unique UNIQUE (assumption_id, version_number)
);

COMMENT ON TABLE business_digital_twin.twin_assumption_versions IS
  'Append-only. Historical assumption statement versions.';

CREATE TABLE business_digital_twin.twin_constraints (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  constraint_code   text          NOT NULL,
  state_variable_definition_id uuid REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE SET NULL,
  operator          text          NOT NULL CHECK (operator IN ('eq','neq','lt','lte','gt','gte','between','in','not_in','contains')),
  operand           jsonb         NOT NULL,
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_constraints_code_unique UNIQUE (instance_id, constraint_code)
);

COMMENT ON TABLE business_digital_twin.twin_constraints IS
  'Governed constraint evaluated against a state variable using a fixed operator set.';

CREATE TABLE business_digital_twin.twin_constraint_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  constraint_id     uuid          NOT NULL REFERENCES business_digital_twin.twin_constraints(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  operator          text          NOT NULL CHECK (operator IN ('eq','neq','lt','lte','gt','gte','between','in','not_in','contains')),
  operand           jsonb         NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_constraint_versions_unique UNIQUE (constraint_id, version_number)
);

COMMENT ON TABLE business_digital_twin.twin_constraint_versions IS
  'Append-only. Historical constraint versions.';

CREATE TABLE business_digital_twin.twin_constraint_evaluations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  constraint_id     uuid          NOT NULL REFERENCES business_digital_twin.twin_constraints(id) ON DELETE RESTRICT,
  snapshot_version_id uuid        REFERENCES business_digital_twin.digital_twin_snapshot_versions(id) ON DELETE SET NULL,
  satisfied         boolean       NOT NULL,
  evaluated_value   jsonb,
  evaluated_at      timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_constraint_evaluations IS
  'Append-only evidence of a constraint evaluation against a snapshot version.';

INSERT INTO _migrations (filename) VALUES ('0055_create_dt_assumptions_constraints.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
