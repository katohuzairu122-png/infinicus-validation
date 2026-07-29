-- Migration: 0116_create_om_feedback_packages
-- Stage 2I — Outcome Monitoring: feedback packages (Group J)

BEGIN;

CREATE TABLE outcome_monitoring.learning_feedback_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_id          uuid          NOT NULL REFERENCES outcome_monitoring.outcome_reviews(id) ON DELETE RESTRICT,
  package_code       text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learning_feedback_packages_code_unique UNIQUE (business_id, package_code)
);

COMMENT ON TABLE outcome_monitoring.learning_feedback_packages IS
  'A governed feedback package prepared for Continuous Learning, built from a completed outcome review.';
CREATE TABLE outcome_monitoring.learning_feedback_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  feedback_package_id  uuid         NOT NULL REFERENCES outcome_monitoring.learning_feedback_packages(id) ON DELETE RESTRICT,
  version_number       integer      NOT NULL,
  summary              text         NOT NULL,
  correlation_id       uuid         NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT learning_feedback_package_versions_unique UNIQUE (feedback_package_id, version_number)
);

COMMENT ON TABLE outcome_monitoring.learning_feedback_package_versions IS
  'Append-only. Historical feedback package summary versions.';
CREATE TABLE outcome_monitoring.learning_feedback_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  feedback_package_version_id  uuid  NOT NULL REFERENCES outcome_monitoring.learning_feedback_package_versions(id) ON DELETE RESTRICT,
  evidence_reference  jsonb         NOT NULL DEFAULT '{}',
  created_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.learning_feedback_evidence IS
  'Append-only. Supporting evidence for a feedback package version.';

INSERT INTO _migrations (filename) VALUES ('0116_create_om_feedback_packages.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
