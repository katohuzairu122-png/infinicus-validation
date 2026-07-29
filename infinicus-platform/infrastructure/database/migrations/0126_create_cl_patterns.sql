-- Migration: 0126_create_cl_patterns
-- Stage 2J — Continuous Learning: patterns (Group E)

BEGIN;

CREATE TABLE continuous_learning.learning_patterns (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          NOT NULL REFERENCES continuous_learning.learning_cases(id) ON DELETE RESTRICT,
  pattern_code       text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','retired')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learning_patterns_code_unique UNIQUE (business_id, pattern_code)
);

COMMENT ON TABLE continuous_learning.learning_patterns IS
  'A recurring pattern detected across learning cases.';
CREATE TABLE continuous_learning.learning_pattern_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  pattern_id         uuid          NOT NULL REFERENCES continuous_learning.learning_patterns(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  description        text          NOT NULL,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learning_pattern_versions_unique UNIQUE (pattern_id, version_number)
);

COMMENT ON TABLE continuous_learning.learning_pattern_versions IS
  'Append-only. Historical pattern description versions.';
CREATE TABLE continuous_learning.pattern_observations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  pattern_version_id uuid          NOT NULL REFERENCES continuous_learning.learning_pattern_versions(id) ON DELETE RESTRICT,
  observed_at        timestamptz   NOT NULL DEFAULT now(),
  detail             jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.pattern_observations IS
  'Append-only. Individual observations backing a detected pattern version.';
CREATE TABLE continuous_learning.pattern_confidence_scores (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  pattern_version_id uuid          NOT NULL REFERENCES continuous_learning.learning_pattern_versions(id) ON DELETE RESTRICT,
  confidence         numeric(5,4)  NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  calculated_at      timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.pattern_confidence_scores IS
  'Append-only. Confidence score calculated for a pattern version.';

INSERT INTO _migrations (filename) VALUES ('0126_create_cl_patterns.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
