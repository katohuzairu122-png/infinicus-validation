-- Migration: 0099_create_aba_control_gates
-- Stage 2H — Approved Business Action: control gates (Group H)

BEGIN;

CREATE TABLE approved_business_action.action_control_gates (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  plan_version_id  uuid           NOT NULL REFERENCES approved_business_action.action_execution_plan_versions(id) ON DELETE RESTRICT,
  gate_code        text           NOT NULL,
  gate_type        text           NOT NULL CHECK (gate_type IN ('manual','automated','compliance')),
  status           text           NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','waived')),
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT action_control_gates_unique UNIQUE (plan_version_id, gate_code)
);

COMMENT ON TABLE approved_business_action.action_control_gates IS
  'A control gate that must be evaluated before an execution plan may proceed.';
CREATE TABLE approved_business_action.action_control_gate_evaluations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  control_gate_id   uuid          NOT NULL REFERENCES approved_business_action.action_control_gates(id) ON DELETE RESTRICT,
  passed            boolean       NOT NULL,
  evaluated_value   jsonb,
  evaluated_at      timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.action_control_gate_evaluations IS
  'Append-only. Evidence of a control gate evaluation.';
CREATE TABLE approved_business_action.action_holds (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  approved_action_id  uuid          NOT NULL REFERENCES approved_business_action.approved_actions(id) ON DELETE RESTRICT,
  hold_code           text          NOT NULL,
  reason              text          NOT NULL,
  held_at             timestamptz   NOT NULL DEFAULT now(),
  created_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.action_holds IS
  'Append-only. Permanent audit record of a hold placed on an approved action.';
CREATE TABLE approved_business_action.action_releases (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  action_hold_id    uuid          NOT NULL REFERENCES approved_business_action.action_holds(id) ON DELETE RESTRICT,
  release_reason    text          NOT NULL,
  released_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.action_releases IS
  'Append-only. Permanent audit record of a hold being released.';

INSERT INTO _migrations (filename) VALUES ('0099_create_aba_control_gates.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
