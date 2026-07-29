-- Migration: 0064_create_sim_models
-- Stage 2F — Simulation: models and versions (Group B)

BEGIN;

CREATE TABLE simulation.simulation_models (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_code        text          NOT NULL,
  name              text          NOT NULL,
  engine_namespace  text          NOT NULL DEFAULT 'window.INFINICUS.SIMULATION',
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_models_code_unique UNIQUE (business_id, model_code)
);

COMMENT ON TABLE simulation.simulation_models IS
  'Named Monte Carlo model (e.g. Engine v3). Mutable while draft/validated; released versions are immutable.';

CREATE TABLE simulation.simulation_model_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_id          uuid          NOT NULL REFERENCES simulation.simulation_models(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  engine_version    text          NOT NULL,
  specification     jsonb         NOT NULL DEFAULT '{}',
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_model_versions_unique UNIQUE (model_id, version_number)
);

COMMENT ON TABLE simulation.simulation_model_versions IS
  'Append-only history; active/released model versions are immutable — see enforce_model_version_immutability.';

CREATE TABLE simulation.simulation_model_parameters (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_version_id  uuid          NOT NULL REFERENCES simulation.simulation_model_versions(id) ON DELETE RESTRICT,
  parameter_code    text          NOT NULL,
  value_type        text          NOT NULL CHECK (value_type IN ('number','integer','boolean','string','enum','json')),
  default_value     jsonb,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_model_parameters IS
  'Append-only. Named parameters exposed by a model version.';

CREATE TABLE simulation.simulation_model_constraints (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_version_id  uuid          NOT NULL REFERENCES simulation.simulation_model_versions(id) ON DELETE RESTRICT,
  constraint_code   text          NOT NULL,
  description       text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_model_constraints IS
  'Append-only. Structural or business constraints a model version enforces (e.g. sample size, horizon bounds).';

INSERT INTO _migrations (filename) VALUES ('0064_create_sim_models.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
