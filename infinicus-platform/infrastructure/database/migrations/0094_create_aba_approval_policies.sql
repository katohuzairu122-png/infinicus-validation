-- Migration: 0094_create_aba_approval_policies
-- Stage 2H — Approved Business Action: approval policies (Group C)

BEGIN;

CREATE TABLE approved_business_action.approval_policies (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_code       text          NOT NULL,
  name              text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired','superseded')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approval_policies_code_unique UNIQUE (business_id, policy_code)
);

COMMENT ON TABLE approved_business_action.approval_policies IS
  'A governance policy approval decisions must be evaluated against.';
CREATE TABLE approved_business_action.approval_policy_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_id         uuid          NOT NULL REFERENCES approved_business_action.approval_policies(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  specification     jsonb         NOT NULL DEFAULT '{}',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approval_policy_versions_unique UNIQUE (policy_id, version_number)
);

COMMENT ON TABLE approved_business_action.approval_policy_versions IS
  'Append-only. Historical policy specification versions.';
CREATE TABLE approved_business_action.approval_policy_rules (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_version_id  uuid          NOT NULL REFERENCES approved_business_action.approval_policy_versions(id) ON DELETE RESTRICT,
  rule_code          text          NOT NULL,
  operator           text          NOT NULL CHECK (operator IN (
                                       'eq','neq','lt','lte','gt','gte','between','in','not_in','contains'
                                     )),
  operand            jsonb         NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_policy_rules IS
  'Append-only. Named policy rules evaluated during review.';
CREATE TABLE approved_business_action.approval_policy_evaluations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_version_id         uuid   NOT NULL REFERENCES approved_business_action.approval_policy_versions(id) ON DELETE RESTRICT,
  review_package_version_id uuid   NOT NULL REFERENCES approved_business_action.action_review_package_versions(id) ON DELETE RESTRICT,
  passed             boolean       NOT NULL,
  evaluated_value    jsonb,
  evaluated_at       timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_policy_evaluations IS
  'Append-only. Evidence of a policy evaluation against a review package version.';

INSERT INTO _migrations (filename) VALUES ('0094_create_aba_approval_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
