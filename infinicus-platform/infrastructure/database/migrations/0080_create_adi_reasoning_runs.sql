-- Migration: 0080_create_adi_reasoning_runs
-- Stage 2G — AI Decision Intelligence: reasoning runs (Group D)

BEGIN;

CREATE TABLE ai_decision_intelligence.reasoning_requests (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_id           uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  request_code      text          NOT NULL,
  idempotency_key   text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT reasoning_requests_idempotency_unique UNIQUE (business_id, idempotency_key)
);

COMMENT ON TABLE ai_decision_intelligence.reasoning_requests IS
  'A request to run governed reasoning for a decision case. Idempotent per (business_id, idempotency_key).';

CREATE TABLE ai_decision_intelligence.reasoning_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  request_id        uuid          NOT NULL REFERENCES ai_decision_intelligence.reasoning_requests(id) ON DELETE RESTRICT,
  case_id           uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  status            text          NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  failure_code      text,
  failure_message   text,
  started_at        timestamptz,
  completed_at      timestamptz,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.reasoning_runs IS
  'A governed reasoning run over a decision case. Structured steps only — never raw hidden chain-of-thought.';

CREATE TABLE ai_decision_intelligence.reasoning_run_steps (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  reasoning_run_id  uuid          NOT NULL REFERENCES ai_decision_intelligence.reasoning_runs(id) ON DELETE RESTRICT,
  step_number       integer       NOT NULL CHECK (step_number >= 1),
  step_type         text          NOT NULL CHECK (step_type IN (
                                     'evidence_review','alternative_generation','risk_assessment','confidence_calculation','policy_evaluation','other'
                                   )),
  summary           text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT reasoning_run_steps_unique UNIQUE (reasoning_run_id, step_number)
);

COMMENT ON TABLE ai_decision_intelligence.reasoning_run_steps IS
  'Append-only. Structured, governed reasoning step summaries — never raw hidden chain-of-thought.';

CREATE TABLE ai_decision_intelligence.reasoning_run_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  reasoning_run_id  uuid          NOT NULL REFERENCES ai_decision_intelligence.reasoning_runs(id) ON DELETE RESTRICT,
  from_status       text,
  to_status         text          NOT NULL CHECK (to_status IN ('queued','running','completed','failed','cancelled')),
  reason            text,
  correlation_id    uuid          NOT NULL,
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.reasoning_run_status_history IS
  'Append-only audit trail of reasoning run lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0080_create_adi_reasoning_runs.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
