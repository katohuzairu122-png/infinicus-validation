-- Migration: 0130_create_cl_approval_release
-- Stage 2J — Continuous Learning: approval and release (Group I)

BEGIN;

CREATE TABLE continuous_learning.learning_change_reviews (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  improvement_proposal_id uuid    NOT NULL REFERENCES continuous_learning.improvement_proposals(id) ON DELETE RESTRICT,
  review_code        text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','completed','cancelled')),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT learning_change_reviews_code_unique UNIQUE (business_id, review_code)
);

COMMENT ON TABLE continuous_learning.learning_change_reviews IS
  'A governance review of a proposed learning-driven change.';
CREATE TABLE continuous_learning.learning_change_decisions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_id          uuid          NOT NULL REFERENCES continuous_learning.learning_change_reviews(id) ON DELETE RESTRICT,
  outcome            text          NOT NULL CHECK (outcome IN ('approved','rejected')),
  rationale          text          NOT NULL,
  decided_at         timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.learning_change_decisions IS
  'Append-only. Permanent record of a learning change review decision.';
CREATE TABLE continuous_learning.learning_change_releases (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  improvement_proposal_id uuid    NOT NULL REFERENCES continuous_learning.improvement_proposals(id) ON DELETE RESTRICT,
  release_code       text          NOT NULL,
  environment        text          NOT NULL DEFAULT 'staging',
  released_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.learning_change_releases IS
  'Append-only. Permanent record of an approved change being released.';
CREATE TABLE continuous_learning.learning_change_rollbacks (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  release_id         uuid          NOT NULL REFERENCES continuous_learning.learning_change_releases(id) ON DELETE RESTRICT,
  reason             text          NOT NULL,
  rolled_back_at     timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.learning_change_rollbacks IS
  'Append-only. Permanent record of a released change being rolled back.';

INSERT INTO _migrations (filename) VALUES ('0130_create_cl_approval_release.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
