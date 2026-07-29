-- Migration: 0097_create_aba_approved_actions
-- Stage 2H — Approved Business Action: approved actions (Group F)

BEGIN;

CREATE TABLE approved_business_action.approved_actions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  decision_id       uuid          NOT NULL REFERENCES approved_business_action.approval_decisions(id) ON DELETE RESTRICT,
  action_code       text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled','superseded')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approved_actions_code_unique UNIQUE (business_id, action_code)
);

COMMENT ON TABLE approved_business_action.approved_actions IS
  'An approved business action derived from an approval decision. Describes what was approved — never a record of execution.';
CREATE TABLE approved_business_action.approved_action_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  action_id         uuid          NOT NULL REFERENCES approved_business_action.approved_actions(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  description       text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approved_action_versions_unique UNIQUE (action_id, version_number)
);

COMMENT ON TABLE approved_business_action.approved_action_versions IS
  'Append-only. Historical approved action description versions.';
CREATE TABLE approved_business_action.approved_action_steps (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  action_version_id  uuid          NOT NULL REFERENCES approved_business_action.approved_action_versions(id) ON DELETE RESTRICT,
  step_number        integer       NOT NULL CHECK (step_number >= 1),
  description        text          NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT approved_action_steps_unique UNIQUE (action_version_id, step_number)
);

COMMENT ON TABLE approved_business_action.approved_action_steps IS
  'Append-only. Descriptive planned steps — never a record of execution. No external business action is executed by this database stage.';
CREATE TABLE approved_business_action.approved_action_constraints (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  action_version_id  uuid          NOT NULL REFERENCES approved_business_action.approved_action_versions(id) ON DELETE RESTRICT,
  constraint_code    text          NOT NULL,
  operator           text          NOT NULL CHECK (operator IN (
                                       'eq','neq','lt','lte','gt','gte','between','in','not_in','contains'
                                     )),
  operand            jsonb         NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approved_action_constraints IS
  'Append-only. Boundary conditions an approved action version must respect.';

INSERT INTO _migrations (filename) VALUES ('0097_create_aba_approved_actions.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
