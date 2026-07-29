-- Migration: 0084_create_adi_confidence_limitations
-- Stage 2G — AI Decision Intelligence: confidence and limitations (Group H)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_confidence_scores (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  confidence         numeric(5,4)  NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  basis              text          NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_confidence_scores IS
  'Append-only. Confidence score evidence for a recommendation version.';

CREATE TABLE ai_decision_intelligence.decision_uncertainties (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  uncertainty_code   text          NOT NULL,
  description        text          NOT NULL,
  impact             text          NOT NULL CHECK (impact IN ('low','medium','high')),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_uncertainties IS
  'Append-only. Named sources of uncertainty affecting a recommendation version.';

CREATE TABLE ai_decision_intelligence.decision_limitations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  limitation_code    text          NOT NULL,
  description        text          NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_limitations IS
  'Append-only. Declared limitations of a recommendation version — governed honesty about what ADI does not know.';

CREATE TABLE ai_decision_intelligence.decision_assumptions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  assumption_code    text          NOT NULL,
  statement          text          NOT NULL,
  source             text          NOT NULL CHECK (source IN ('observed','declared','derived','inferred','external')),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_assumptions IS
  'Append-only. Assumptions a recommendation version depends on.';

INSERT INTO _migrations (filename) VALUES ('0084_create_adi_confidence_limitations.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
