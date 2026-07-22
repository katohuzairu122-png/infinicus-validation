-- Migration: 0100_create_aba_exceptions_appeals
-- Stage 2H — Approved Business Action: exceptions and appeals (Group I)

BEGIN;

CREATE TABLE approved_business_action.approval_exceptions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_package_id  uuid          NOT NULL REFERENCES approved_business_action.action_review_packages(id) ON DELETE RESTRICT,
  exception_code     text          NOT NULL,
  reason             text          NOT NULL,
  status             text          NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','denied')),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approval_exceptions_code_unique UNIQUE (business_id, exception_code)
);

COMMENT ON TABLE approved_business_action.approval_exceptions IS
  'A requested exception to normal approval policy for a review package.';
CREATE TABLE approved_business_action.approval_exception_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  exception_id      uuid          NOT NULL REFERENCES approved_business_action.approval_exceptions(id) ON DELETE RESTRICT,
  evidence_reference jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_exception_evidence IS
  'Append-only. Supporting evidence for an exception request.';
CREATE TABLE approved_business_action.approval_appeals (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  decision_id       uuid          NOT NULL REFERENCES approved_business_action.approval_decisions(id) ON DELETE RESTRICT,
  appeal_code       text          NOT NULL,
  reason            text          NOT NULL,
  status            text          NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','overturned','dismissed')),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approval_appeals_code_unique UNIQUE (business_id, appeal_code)
);

COMMENT ON TABLE approved_business_action.approval_appeals IS
  'An appeal of an approval decision.';
CREATE TABLE approved_business_action.approval_appeal_decisions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  appeal_id         uuid          NOT NULL REFERENCES approved_business_action.approval_appeals(id) ON DELETE RESTRICT,
  outcome           text          NOT NULL CHECK (outcome IN ('upheld','overturned','dismissed')),
  rationale         text          NOT NULL,
  decided_at        timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_appeal_decisions IS
  'Append-only. Permanent record of the resolution of an appeal.';

INSERT INTO _migrations (filename) VALUES ('0100_create_aba_exceptions_appeals.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
