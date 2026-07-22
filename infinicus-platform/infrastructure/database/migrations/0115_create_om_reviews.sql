-- Migration: 0115_create_om_reviews
-- Stage 2I — Outcome Monitoring: reviews (Group I)

BEGIN;

CREATE TABLE outcome_monitoring.outcome_reviews (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  observation_id     uuid          NOT NULL REFERENCES outcome_monitoring.outcome_observations(id) ON DELETE RESTRICT,
  review_code        text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','completed','cancelled')),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT outcome_reviews_code_unique UNIQUE (business_id, review_code)
);

COMMENT ON TABLE outcome_monitoring.outcome_reviews IS
  'A governance review of an observed outcome.';
CREATE TABLE outcome_monitoring.outcome_review_findings (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_id          uuid          NOT NULL REFERENCES outcome_monitoring.outcome_reviews(id) ON DELETE RESTRICT,
  finding_code       text          NOT NULL,
  statement          text          NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_review_findings IS
  'Append-only. Structured findings recorded during an outcome review.';
CREATE TABLE outcome_monitoring.outcome_review_actions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_id          uuid          NOT NULL REFERENCES outcome_monitoring.outcome_reviews(id) ON DELETE RESTRICT,
  action_code        text          NOT NULL,
  description        text          NOT NULL,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_review_actions IS
  'Append-only. Recommended follow-up actions from an outcome review.';
CREATE TABLE outcome_monitoring.outcome_review_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  review_id          uuid          NOT NULL REFERENCES outcome_monitoring.outcome_reviews(id) ON DELETE RESTRICT,
  from_status        text,
  to_status          text          NOT NULL CHECK (to_status IN ('draft','in_review','completed','cancelled')),
  reason             text,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  occurred_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_review_status_history IS
  'Append-only audit trail of outcome review lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0115_create_om_reviews.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
