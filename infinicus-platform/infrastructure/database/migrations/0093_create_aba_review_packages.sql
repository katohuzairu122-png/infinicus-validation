-- Migration: 0093_create_aba_review_packages
-- Stage 2H — Approved Business Action: review packages (Group B)

BEGIN;

CREATE TABLE approved_business_action.action_review_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id  uuid          NOT NULL REFERENCES approved_business_action.aba_intake_packages(id) ON DELETE RESTRICT,
  review_code        text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','completed','cancelled')),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT action_review_packages_code_unique UNIQUE (business_id, review_code)
);

COMMENT ON TABLE approved_business_action.action_review_packages IS
  'A governed review package prepared for approvers, built from an accepted ADI recommendation intake.';
CREATE TABLE approved_business_action.action_review_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_package_id  uuid          NOT NULL REFERENCES approved_business_action.action_review_packages(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  summary            text          NOT NULL,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT action_review_package_versions_unique UNIQUE (review_package_id, version_number)
);

COMMENT ON TABLE approved_business_action.action_review_package_versions IS
  'Append-only. Historical review package summary versions.';
CREATE TABLE approved_business_action.action_review_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_package_version_id  uuid   NOT NULL REFERENCES approved_business_action.action_review_package_versions(id) ON DELETE RESTRICT,
  evidence_type      text          NOT NULL CHECK (evidence_type IN (
                                      'adi_recommendation','simulation_result','business_intelligence_finding','external','other'
                                    )),
  evidence_reference jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.action_review_evidence IS
  'Append-only. Never fabricates upstream evidence — only records a reference and summary.';
CREATE TABLE approved_business_action.action_review_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_package_id  uuid          NOT NULL REFERENCES approved_business_action.action_review_packages(id) ON DELETE RESTRICT,
  from_status        text,
  to_status          text          NOT NULL CHECK (to_status IN ('draft','in_review','completed','cancelled')),
  reason             text,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  occurred_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.action_review_status_history IS
  'Append-only audit trail of review package lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0093_create_aba_review_packages.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
