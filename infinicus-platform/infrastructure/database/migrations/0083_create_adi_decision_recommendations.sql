-- Migration: 0083_create_adi_decision_recommendations
-- Stage 2G — AI Decision Intelligence: recommendations (Group G)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_recommendations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_id                uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  chosen_alternative_id  uuid          REFERENCES ai_decision_intelligence.decision_alternatives(id) ON DELETE SET NULL,
  recommendation_code    text          NOT NULL,
  status                 text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','superseded','rejected')),
  latest_version         integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_recommendations_code_unique UNIQUE (case_id, recommendation_code)
);

COMMENT ON TABLE ai_decision_intelligence.decision_recommendations IS
  'A governed recommendation for a decision case. A recommendation only — ADI never approves or executes it. Published recommendations are immutable.';

CREATE TABLE ai_decision_intelligence.decision_recommendation_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_id  uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_recommendations(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  summary            text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','superseded','rejected')),
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_recommendation_versions_unique UNIQUE (recommendation_id, version_number)
);

COMMENT ON TABLE ai_decision_intelligence.decision_recommendation_versions IS
  'Append-only. Published recommendation versions are immutable — see enforce_recommendation_version_immutability.';

CREATE TABLE ai_decision_intelligence.recommendation_rationales (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  rationale_code     text          NOT NULL,
  statement          text          NOT NULL,
  evidence_reference jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.recommendation_rationales IS
  'Append-only. Structured, governed rationale for a recommendation version — never hidden chain-of-thought.';

CREATE TABLE ai_decision_intelligence.recommendation_implementation_steps (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  step_number        integer       NOT NULL CHECK (step_number >= 1),
  description        text          NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_implementation_steps_unique UNIQUE (recommendation_version_id, step_number)
);

COMMENT ON TABLE ai_decision_intelligence.recommendation_implementation_steps IS
  'Append-only. Suggested implementation steps — descriptive only. ADI never executes them; execution authority belongs to ABA.';

INSERT INTO _migrations (filename) VALUES ('0083_create_adi_decision_recommendations.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
