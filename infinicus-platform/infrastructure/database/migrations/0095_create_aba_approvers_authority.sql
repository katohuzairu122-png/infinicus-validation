-- Migration: 0095_create_aba_approvers_authority
-- Stage 2H — Approved Business Action: approvers and authority (Group D)

BEGIN;

CREATE TABLE approved_business_action.approver_assignments (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  user_id           uuid          NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  assignment_code   text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','revoked')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approver_assignments_code_unique UNIQUE (business_id, assignment_code)
);

COMMENT ON TABLE approved_business_action.approver_assignments IS
  'An assignment of approval authority to a user.';
CREATE TABLE approved_business_action.approver_assignment_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  assignment_id     uuid          NOT NULL REFERENCES approved_business_action.approver_assignments(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  role_code         text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approver_assignment_versions_unique UNIQUE (assignment_id, version_number)
);

COMMENT ON TABLE approved_business_action.approver_assignment_versions IS
  'Append-only. Historical approver role versions.';
CREATE TABLE approved_business_action.approval_authority_scopes (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  assignment_version_id  uuid   NOT NULL REFERENCES approved_business_action.approver_assignment_versions(id) ON DELETE RESTRICT,
  scope_type        text          NOT NULL,
  scope_value       jsonb         NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_authority_scopes IS
  'Append-only. Named authority-scope boundaries for an approver assignment version.';
CREATE TABLE approved_business_action.approval_delegations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  delegator_user_id  uuid          NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  delegate_user_id   uuid          NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  assignment_id      uuid          NOT NULL REFERENCES approved_business_action.approver_assignments(id) ON DELETE RESTRICT,
  status             text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  starts_at          timestamptz   NOT NULL DEFAULT now(),
  ends_at            timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_delegations IS
  'A temporary delegation of approval authority from one user to another.';

INSERT INTO _migrations (filename) VALUES ('0095_create_aba_approvers_authority.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
