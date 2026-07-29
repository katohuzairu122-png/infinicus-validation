-- Migration: 0082_create_adi_decision_alternatives
-- Stage 2G — AI Decision Intelligence: alternatives (Group F)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_alternatives (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_id           uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  alternative_code  text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_alternatives_code_unique UNIQUE (case_id, alternative_code)
);

COMMENT ON TABLE ai_decision_intelligence.decision_alternatives IS
  'A candidate alternative evaluated for a decision case.';

CREATE TABLE ai_decision_intelligence.decision_alternative_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  alternative_id    uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_alternatives(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  description       text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_alternative_versions_unique UNIQUE (alternative_id, version_number)
);

COMMENT ON TABLE ai_decision_intelligence.decision_alternative_versions IS
  'Append-only. Historical alternative description versions.';

CREATE TABLE ai_decision_intelligence.alternative_outcome_estimates (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  alternative_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_alternative_versions(id) ON DELETE RESTRICT,
  metric_code       text          NOT NULL,
  estimated_value   jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.alternative_outcome_estimates IS
  'Append-only. Outcome estimates for an alternative version — never fabricated Simulation evidence, only referenced.';

CREATE TABLE ai_decision_intelligence.alternative_risk_profiles (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  alternative_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_alternative_versions(id) ON DELETE RESTRICT,
  risk_code         text          NOT NULL,
  severity          text          NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  likelihood        numeric(5,4)  CHECK (likelihood IS NULL OR (likelihood BETWEEN 0 AND 1)),
  description       text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.alternative_risk_profiles IS
  'Append-only. Named risks identified for an alternative version.';

INSERT INTO _migrations (filename) VALUES ('0082_create_adi_decision_alternatives.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
