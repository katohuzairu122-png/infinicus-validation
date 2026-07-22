-- Migration: 0052_create_dt_state_variables
-- Stage 2E — Business Digital Twin: state variables (Group E) — precedes snapshots which reference variable definitions

BEGIN;

CREATE TABLE business_digital_twin.state_variable_definitions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  variable_code     text          NOT NULL,
  name              text          NOT NULL,
  category          text          NOT NULL CHECK (category IN (
                                     'financial','operational','customer','market','resource',
                                     'risk','capacity','behavioral','regulatory','custom'
                                   )),
  value_type        text          NOT NULL CHECK (value_type IN (
                                     'number','integer','boolean','string','date','timestamp',
                                     'percentage','currency','enum','json'
                                   )),
  unit              text,
  allowed_range     jsonb,
  allowed_values    jsonb,
  nullable          boolean       NOT NULL DEFAULT false,
  derivation_method text,
  source_classification text      NOT NULL DEFAULT 'observed',
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT state_variable_definitions_code_unique UNIQUE (business_id, variable_code)
);

COMMENT ON TABLE business_digital_twin.state_variable_definitions IS
  'Canonical definition of a state variable: type, unit, range, allowed values, and source classification.';

CREATE TABLE business_digital_twin.state_variable_definition_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  definition_id     uuid          NOT NULL REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  specification     jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT state_variable_definition_versions_unique UNIQUE (definition_id, version_number)
);

COMMENT ON TABLE business_digital_twin.state_variable_definition_versions IS
  'Append-only. Historical state-variable definition versions.';

CREATE TABLE business_digital_twin.state_variable_values (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  definition_id     uuid          NOT NULL REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  value_json        jsonb         NOT NULL,
  effective_at      timestamptz   NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.state_variable_values IS
  'Append-only. Recorded state-variable values for a twin instance.';

CREATE TABLE business_digital_twin.state_variable_value_quality (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  state_variable_value_id  uuid    NOT NULL REFERENCES business_digital_twin.state_variable_values(id) ON DELETE RESTRICT,
  quality_score     numeric(5,4)  CHECK (quality_score IS NULL OR (quality_score BETWEEN 0 AND 1)),
  freshness_seconds integer       CHECK (freshness_seconds IS NULL OR freshness_seconds >= 0),
  reliability_score numeric(5,4)  CHECK (reliability_score IS NULL OR (reliability_score BETWEEN 0 AND 1)),
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.state_variable_value_quality IS
  'Append-only. Quality/freshness/reliability evidence for a recorded state-variable value.';

INSERT INTO _migrations (filename) VALUES ('0052_create_dt_state_variables.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
