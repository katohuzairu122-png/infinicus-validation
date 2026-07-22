-- Migration: 0131_create_cl_knowledge_registry
-- Stage 2J — Continuous Learning: knowledge registry (Group J)

BEGIN;

CREATE TABLE continuous_learning.knowledge_artifacts (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  artifact_code      text          NOT NULL,
  artifact_type      text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','superseded','retired')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_artifacts_code_unique UNIQUE (business_id, artifact_code)
);

COMMENT ON TABLE continuous_learning.knowledge_artifacts IS
  'A governed knowledge artifact (lesson, pattern, or model summary) registered for reuse.';
CREATE TABLE continuous_learning.knowledge_artifact_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  artifact_id        uuid          NOT NULL REFERENCES continuous_learning.knowledge_artifacts(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  content_reference  jsonb         NOT NULL DEFAULT '{}',
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_artifact_versions_unique UNIQUE (artifact_id, version_number)
);

COMMENT ON TABLE continuous_learning.knowledge_artifact_versions IS
  'Append-only. Historical knowledge artifact content versions.';
CREATE TABLE continuous_learning.knowledge_relationships (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  artifact_version_id uuid         NOT NULL REFERENCES continuous_learning.knowledge_artifact_versions(id) ON DELETE RESTRICT,
  related_artifact_id uuid         NOT NULL REFERENCES continuous_learning.knowledge_artifacts(id) ON DELETE RESTRICT,
  relationship_type   text         NOT NULL CHECK (relationship_type IN ('derived_from','supports','contradicts','supersedes')),
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.knowledge_relationships IS
  'Append-only. Declared relationships between knowledge artifacts.';
CREATE TABLE continuous_learning.knowledge_supersessions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  superseded_artifact_id  uuid     NOT NULL REFERENCES continuous_learning.knowledge_artifacts(id) ON DELETE RESTRICT,
  superseding_artifact_id uuid     NOT NULL REFERENCES continuous_learning.knowledge_artifacts(id) ON DELETE RESTRICT,
  reason                  text     NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.knowledge_supersessions IS
  'Append-only. Permanent record of one knowledge artifact superseding another.';

INSERT INTO _migrations (filename) VALUES ('0131_create_cl_knowledge_registry.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
