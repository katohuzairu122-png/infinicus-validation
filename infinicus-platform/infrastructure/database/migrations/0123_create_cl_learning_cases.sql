-- Migration: 0123_create_cl_learning_cases
-- Stage 2J — Continuous Learning: learning cases (Group B)

BEGIN;

CREATE TABLE continuous_learning.learning_cases (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id  uuid          NOT NULL REFERENCES continuous_learning.cl_intake_packages(id) ON DELETE RESTRICT,
  case_code          text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learning_cases_code_unique UNIQUE (business_id, case_code)
);

COMMENT ON TABLE continuous_learning.learning_cases IS
  'A governed learning case opened from an accepted Outcome Monitoring intake, the root aggregate all learning activity for an observed outcome traces back to.';
CREATE TABLE continuous_learning.learning_case_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          NOT NULL REFERENCES continuous_learning.learning_cases(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  summary            text          NOT NULL,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learning_case_versions_unique UNIQUE (learning_case_id, version_number)
);

COMMENT ON TABLE continuous_learning.learning_case_versions IS
  'Append-only. Historical learning case summary versions.';
CREATE TABLE continuous_learning.learning_case_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          NOT NULL REFERENCES continuous_learning.learning_cases(id) ON DELETE RESTRICT,
  from_status        text,
  to_status          text          NOT NULL CHECK (to_status IN ('draft','active','completed','cancelled')),
  reason             text,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  occurred_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.learning_case_status_history IS
  'Append-only audit trail of learning case lifecycle transitions.';
CREATE TABLE continuous_learning.learning_case_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          NOT NULL REFERENCES continuous_learning.learning_cases(id) ON DELETE RESTRICT,
  evidence_type      text          NOT NULL CHECK (evidence_type IN (
                                      'observation','feedback','review_finding','external','other'
                                    )),
  evidence_reference jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.learning_case_evidence IS
  'Append-only. Never fabricates upstream evidence — only records a reference.';

INSERT INTO _migrations (filename) VALUES ('0123_create_cl_learning_cases.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
