-- Migration: 0079_create_adi_decision_cases
-- Stage 2G — AI Decision Intelligence: decision cases (Group C)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_cases (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  question_id       uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_questions(id) ON DELETE RESTRICT,
  intake_package_id uuid          REFERENCES ai_decision_intelligence.adi_intake_packages(id) ON DELETE SET NULL,
  case_code         text          NOT NULL,
  status            text          NOT NULL DEFAULT 'open' CHECK (status IN (
                                     'open','reasoning','evidence_gathered','alternatives_generated','recommended','closed','cancelled'
                                   )),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_cases_code_unique UNIQUE (business_id, case_code)
);

COMMENT ON TABLE ai_decision_intelligence.decision_cases IS
  'A governed decision case working through the ADI reasoning lifecycle. ADI evaluates and recommends here; it never approves or executes.';

CREATE TABLE ai_decision_intelligence.decision_case_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_id           uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  summary           text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_case_versions_unique UNIQUE (case_id, version_number)
);

COMMENT ON TABLE ai_decision_intelligence.decision_case_versions IS
  'Append-only. Historical decision case summary versions.';

CREATE TABLE ai_decision_intelligence.decision_case_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_id           uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  from_status       text,
  to_status         text          NOT NULL CHECK (to_status IN (
                                     'open','reasoning','evidence_gathered','alternatives_generated','recommended','closed','cancelled'
                                   )),
  reason            text,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_case_status_history IS
  'Append-only audit trail of decision case lifecycle transitions.';

CREATE TABLE ai_decision_intelligence.decision_case_inputs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_version_id   uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_case_versions(id) ON DELETE RESTRICT,
  input_type        text          NOT NULL,
  input_reference   jsonb         NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_case_inputs IS
  'Append-only. Named inputs a decision case version was built from.';

INSERT INTO _migrations (filename) VALUES ('0079_create_adi_decision_cases.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
