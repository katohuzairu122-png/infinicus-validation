-- Migration: 0124_create_cl_feedback
-- Stage 2J — Continuous Learning: feedback (Group C)

BEGIN;

CREATE TABLE continuous_learning.learning_feedback_records (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          NOT NULL REFERENCES continuous_learning.learning_cases(id) ON DELETE RESTRICT,
  feedback_code      text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','superseded')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learning_feedback_records_code_unique UNIQUE (business_id, feedback_code)
);

COMMENT ON TABLE continuous_learning.learning_feedback_records IS
  'A governed record of feedback ingested into a learning case.';
CREATE TABLE continuous_learning.learning_feedback_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  feedback_record_id  uuid         NOT NULL REFERENCES continuous_learning.learning_feedback_records(id) ON DELETE RESTRICT,
  version_number      integer      NOT NULL,
  summary             text         NOT NULL,
  correlation_id      uuid         NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT learning_feedback_versions_unique UNIQUE (feedback_record_id, version_number)
);

COMMENT ON TABLE continuous_learning.learning_feedback_versions IS
  'Append-only. Historical feedback record summary versions.';
CREATE TABLE continuous_learning.learning_feedback_links (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  feedback_version_id  uuid         NOT NULL REFERENCES continuous_learning.learning_feedback_versions(id) ON DELETE RESTRICT,
  link_type            text         NOT NULL,
  linked_reference      jsonb        NOT NULL DEFAULT '{}',
  created_at            timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.learning_feedback_links IS
  'Append-only. Named links from a feedback version to upstream evidence.';
CREATE TABLE continuous_learning.learning_feedback_quality (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  feedback_version_id  uuid         NOT NULL REFERENCES continuous_learning.learning_feedback_versions(id) ON DELETE RESTRICT,
  quality_score        numeric(5,4) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
  assessed_at           timestamptz  NOT NULL DEFAULT now(),
  created_at            timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.learning_feedback_quality IS
  'Append-only. Quality assessment of a feedback version.';

INSERT INTO _migrations (filename) VALUES ('0124_create_cl_feedback.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
