-- Migration: 0057_create_dt_uncertainty
-- Stage 2E — Business Digital Twin: uncertainty and confidence (Group I)

BEGIN;

CREATE TABLE business_digital_twin.twin_uncertainty_models (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_code        text          NOT NULL,
  name              text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_uncertainty_models_code_unique UNIQUE (business_id, model_code)
);

COMMENT ON TABLE business_digital_twin.twin_uncertainty_models IS
  'Named uncertainty model applied to state variables.';

CREATE TABLE business_digital_twin.twin_uncertainty_model_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  uncertainty_model_id uuid       NOT NULL REFERENCES business_digital_twin.twin_uncertainty_models(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  specification     jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT twin_uncertainty_model_versions_unique UNIQUE (uncertainty_model_id, version_number)
);

COMMENT ON TABLE business_digital_twin.twin_uncertainty_model_versions IS
  'Append-only. Historical uncertainty model versions.';

CREATE TABLE business_digital_twin.twin_uncertainty_assignments (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  uncertainty_model_id uuid       NOT NULL REFERENCES business_digital_twin.twin_uncertainty_models(id) ON DELETE RESTRICT,
  state_variable_definition_id uuid NOT NULL REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE RESTRICT,
  distribution_type text          NOT NULL CHECK (distribution_type IN (
                                     'fixed','uniform','normal','lognormal','triangular','beta','empirical','categorical'
                                   )),
  parameters        jsonb         NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_uncertainty_assignments IS
  'Append-only. Distribution assignment for a state variable under an uncertainty model.';

CREATE TABLE business_digital_twin.twin_confidence_scores (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  snapshot_version_id uuid        REFERENCES business_digital_twin.digital_twin_snapshot_versions(id) ON DELETE SET NULL,
  confidence        numeric(5,4)  NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  basis             text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.twin_confidence_scores IS
  'Append-only. Confidence score evidence for a twin instance or snapshot version.';

INSERT INTO _migrations (filename) VALUES ('0057_create_dt_uncertainty.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
