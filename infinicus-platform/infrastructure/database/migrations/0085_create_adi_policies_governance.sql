-- Migration: 0085_create_adi_policies_governance
-- Stage 2G — AI Decision Intelligence: policies and governance (Group I)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_policies (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_code       text          NOT NULL,
  name              text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired','superseded')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_policies_code_unique UNIQUE (business_id, policy_code)
);

COMMENT ON TABLE ai_decision_intelligence.decision_policies IS
  'A governance policy or guardrail ADI recommendations must be evaluated against.';

CREATE TABLE ai_decision_intelligence.decision_policy_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_id         uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_policies(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  specification     jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_policy_versions_unique UNIQUE (policy_id, version_number)
);

COMMENT ON TABLE ai_decision_intelligence.decision_policy_versions IS
  'Append-only. Historical policy specification versions.';

CREATE TABLE ai_decision_intelligence.decision_policy_evaluations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_version_id         uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_policy_versions(id) ON DELETE RESTRICT,
  recommendation_version_id uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  passed             boolean       NOT NULL,
  evaluated_value    jsonb,
  evaluated_at       timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_policy_evaluations IS
  'Append-only. Evidence of a policy evaluation against a recommendation version.';

CREATE TABLE ai_decision_intelligence.decision_guardrail_violations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_id                    uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  recommendation_version_id  uuid   REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE SET NULL,
  guardrail_code     text          NOT NULL,
  severity           text          NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  description        text          NOT NULL,
  detected_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_guardrail_violations IS
  'Append-only. Detected guardrail violations — permanent audit evidence, never edited or hidden.';

INSERT INTO _migrations (filename) VALUES ('0085_create_adi_policies_governance.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
