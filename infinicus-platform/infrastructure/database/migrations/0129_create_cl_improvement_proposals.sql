-- Migration: 0129_create_cl_improvement_proposals
-- Stage 2J — Continuous Learning: improvement proposals (Group H)

BEGIN;

CREATE TABLE continuous_learning.improvement_proposals (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  learning_case_id   uuid          NOT NULL REFERENCES continuous_learning.learning_cases(id) ON DELETE RESTRICT,
  proposal_code      text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN (
                                      'draft','proposed','under_review','approved','rejected','superseded'
                                    )),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT improvement_proposals_code_unique UNIQUE (business_id, proposal_code)
);

COMMENT ON TABLE continuous_learning.improvement_proposals IS
  'A governed proposal for a learning-driven change. This is where CL exercises its change-proposal authority — the proposal, once approved or rejected, is permanently immutable. Learning may propose governed changes but must never silently mutate frozen historical evidence, decisions, approvals, or outcomes.';
CREATE TABLE continuous_learning.improvement_proposal_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  proposal_id        uuid          NOT NULL REFERENCES continuous_learning.improvement_proposals(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  summary            text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN (
                                      'draft','proposed','under_review','approved','rejected','superseded'
                                    )),
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT improvement_proposal_versions_unique UNIQUE (proposal_id, version_number)
);

COMMENT ON TABLE continuous_learning.improvement_proposal_versions IS
  'Append-only. Decided (approved/rejected) proposal versions are immutable — see enforce_proposal_version_immutability.';
CREATE TABLE continuous_learning.improvement_impacts (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  proposal_version_id uuid         NOT NULL REFERENCES continuous_learning.improvement_proposal_versions(id) ON DELETE RESTRICT,
  impact_type         text         NOT NULL,
  magnitude           jsonb        NOT NULL DEFAULT '{}',
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.improvement_impacts IS
  'Append-only. Assessed impacts of a proposed improvement.';
CREATE TABLE continuous_learning.improvement_risks (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  proposal_version_id uuid         NOT NULL REFERENCES continuous_learning.improvement_proposal_versions(id) ON DELETE RESTRICT,
  risk_code           text         NOT NULL,
  description         text         NOT NULL,
  severity            text         NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.improvement_risks IS
  'Append-only. Identified risks of a proposed improvement.';

INSERT INTO _migrations (filename) VALUES ('0129_create_cl_improvement_proposals.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
