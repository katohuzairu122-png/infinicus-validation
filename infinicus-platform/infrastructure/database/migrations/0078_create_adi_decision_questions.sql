-- Migration: 0078_create_adi_decision_questions
-- Stage 2G — AI Decision Intelligence: decision questions (Group B)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_questions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  question_code     text          NOT NULL,
  statement         text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','active','superseded','retired')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_questions_code_unique UNIQUE (business_id, question_code)
);

COMMENT ON TABLE ai_decision_intelligence.decision_questions IS
  'A governed decision question ADI reasons about on behalf of a business.';

CREATE TABLE ai_decision_intelligence.decision_question_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  question_id       uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_questions(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  statement         text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_question_versions_unique UNIQUE (question_id, version_number)
);

COMMENT ON TABLE ai_decision_intelligence.decision_question_versions IS
  'Append-only. Historical decision question statement versions.';

CREATE TABLE ai_decision_intelligence.decision_objectives (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  question_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_question_versions(id) ON DELETE RESTRICT,
  objective_code    text          NOT NULL,
  description       text          NOT NULL,
  weight            numeric(5,4)  CHECK (weight IS NULL OR (weight BETWEEN 0 AND 1)),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_objectives IS
  'Append-only. Named objectives a decision question is evaluated against.';

CREATE TABLE ai_decision_intelligence.decision_constraints (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  question_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_question_versions(id) ON DELETE RESTRICT,
  constraint_code   text          NOT NULL,
  operator          text          NOT NULL CHECK (operator IN (
                                     'eq','neq','lt','lte','gt','gte','between','in','not_in','contains'
                                   )),
  operand           jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_constraints IS
  'Append-only. Named constraints a decision question must satisfy.';

INSERT INTO _migrations (filename) VALUES ('0078_create_adi_decision_questions.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
