-- Migration: 0125_create_cl_lessons
-- Stage 2J — Continuous Learning: lessons (Group D)

BEGIN;

CREATE TABLE continuous_learning.learned_lessons (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          NOT NULL REFERENCES continuous_learning.learning_cases(id) ON DELETE RESTRICT,
  lesson_code        text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','retired')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learned_lessons_code_unique UNIQUE (business_id, lesson_code)
);

COMMENT ON TABLE continuous_learning.learned_lessons IS
  'A distilled lesson learned from a learning case.';
CREATE TABLE continuous_learning.learned_lesson_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  lesson_id          uuid          NOT NULL REFERENCES continuous_learning.learned_lessons(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  statement          text          NOT NULL,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learned_lesson_versions_unique UNIQUE (lesson_id, version_number)
);

COMMENT ON TABLE continuous_learning.learned_lesson_versions IS
  'Append-only. Historical lesson statement versions.';
CREATE TABLE continuous_learning.lesson_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  lesson_version_id  uuid          NOT NULL REFERENCES continuous_learning.learned_lesson_versions(id) ON DELETE RESTRICT,
  evidence_reference jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.lesson_evidence IS
  'Append-only. Supporting evidence for a lesson version.';
CREATE TABLE continuous_learning.lesson_applicability (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  lesson_version_id  uuid          NOT NULL REFERENCES continuous_learning.learned_lesson_versions(id) ON DELETE RESTRICT,
  scope_type         text          NOT NULL,
  scope_value        jsonb         NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.lesson_applicability IS
  'Append-only. Declared scope in which a lesson version applies.';

INSERT INTO _migrations (filename) VALUES ('0125_create_cl_lessons.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
