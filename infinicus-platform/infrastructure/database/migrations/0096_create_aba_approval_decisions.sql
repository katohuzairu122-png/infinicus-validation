-- Migration: 0096_create_aba_approval_decisions
-- Stage 2H — Approved Business Action: approval decisions (Group E)

BEGIN;

CREATE TABLE approved_business_action.approval_decisions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_package_id      uuid          NOT NULL REFERENCES approved_business_action.action_review_packages(id) ON DELETE RESTRICT,
  approver_assignment_id uuid          NOT NULL REFERENCES approved_business_action.approver_assignments(id) ON DELETE RESTRICT,
  decision_code          text          NOT NULL,
  status                 text          NOT NULL DEFAULT 'draft' CHECK (status IN (
                                          'draft','approved','approved_with_modifications','rejected','superseded'
                                        )),
  latest_version         integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approval_decisions_code_unique UNIQUE (business_id, decision_code)
);

COMMENT ON TABLE approved_business_action.approval_decisions IS
  'A governed approval decision. This is where ABA exercises approval authority — the decision, once approved, approved with modifications, or rejected, is permanently immutable.';
CREATE TABLE approved_business_action.approval_decision_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  decision_id       uuid          NOT NULL REFERENCES approved_business_action.approval_decisions(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  summary           text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN (
                                      'draft','approved','approved_with_modifications','rejected','superseded'
                                    )),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approval_decision_versions_unique UNIQUE (decision_id, version_number)
);

COMMENT ON TABLE approved_business_action.approval_decision_versions IS
  'Append-only. Decided (approved/approved_with_modifications/rejected) decision versions are immutable — see enforce_decision_version_immutability.';
CREATE TABLE approved_business_action.approval_decision_rationales (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  decision_version_id  uuid   NOT NULL REFERENCES approved_business_action.approval_decision_versions(id) ON DELETE RESTRICT,
  rationale_code    text          NOT NULL,
  statement         text          NOT NULL,
  evidence_reference jsonb        NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_decision_rationales IS
  'Append-only. Structured, governed rationale for a decision version.';
CREATE TABLE approved_business_action.approval_decision_modifications (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  decision_version_id  uuid   NOT NULL REFERENCES approved_business_action.approval_decision_versions(id) ON DELETE RESTRICT,
  modification_code text          NOT NULL,
  description       text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_decision_modifications IS
  'Append-only. Records what was modified when a decision is approved_with_modifications.';

INSERT INTO _migrations (filename) VALUES ('0096_create_aba_approval_decisions.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
