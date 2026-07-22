-- Migration: 0128_create_cl_policy_evaluation
-- Stage 2J — Continuous Learning: policy evaluation (Group G)

BEGIN;

CREATE TABLE continuous_learning.policy_evaluation_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  approval_policy_id uuid          REFERENCES approved_business_action.approval_policies(id) ON DELETE SET NULL,
  learning_case_id   uuid          REFERENCES continuous_learning.learning_cases(id) ON DELETE SET NULL,
  status             text          NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  requested_at       timestamptz   NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.policy_evaluation_runs IS
  'A run evaluating a governance policy — may reference an existing ABA policy, or evaluate a candidate policy not yet adopted.';
CREATE TABLE continuous_learning.policy_evaluation_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evaluation_run_id  uuid          NOT NULL REFERENCES continuous_learning.policy_evaluation_runs(id) ON DELETE RESTRICT,
  finding_code       text          NOT NULL,
  detail             jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.policy_evaluation_results IS
  'Append-only. Findings from a policy evaluation run.';
CREATE TABLE continuous_learning.policy_change_proposals (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evaluation_run_id  uuid          NOT NULL REFERENCES continuous_learning.policy_evaluation_runs(id) ON DELETE RESTRICT,
  proposal_code      text          NOT NULL,
  rationale          text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','proposed','withdrawn')),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT policy_change_proposals_code_unique UNIQUE (business_id, proposal_code)
);

COMMENT ON TABLE continuous_learning.policy_change_proposals IS
  'A proposed change to a governance policy, derived from an evaluation run. Never itself an approval — proposals are decided by improvement_proposals/learning_change_reviews.';
CREATE TABLE continuous_learning.policy_change_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  policy_change_proposal_id uuid   NOT NULL REFERENCES continuous_learning.policy_change_proposals(id) ON DELETE RESTRICT,
  evidence_reference jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.policy_change_evidence IS
  'Append-only. Supporting evidence for a policy change proposal.';

INSERT INTO _migrations (filename) VALUES ('0128_create_cl_policy_evaluation.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
