-- Migration: 0132_create_cl_feedback_publication
-- Stage 2J — Continuous Learning: feedback publication (Group K)

BEGIN;

CREATE TABLE continuous_learning.cl_feedback_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  improvement_proposal_id uuid    NOT NULL REFERENCES continuous_learning.improvement_proposals(id) ON DELETE RESTRICT,
  package_code        text          NOT NULL,
  latest_version      integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  target_layer        text          NOT NULL CHECK (target_layer IN ('data_acquisition')),
  target_block        text          NOT NULL,
  publication_status  text          NOT NULL DEFAULT 'draft' CHECK (publication_status IN (
                                        'draft','ready','dispatched','acknowledged','rejected','revoked'
                                      )),
  idempotency_key     text          NOT NULL,
  dispatched_at       timestamptz,
  acknowledged_at     timestamptz,
  rejected_at         timestamptz,
  rejection_reason    text,
  revoked_at          timestamptz,
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT cl_feedback_packages_idempotency_unique UNIQUE (business_id, idempotency_key),
  CONSTRAINT cl_feedback_packages_code_unique UNIQUE (business_id, package_code)
);

COMMENT ON TABLE continuous_learning.cl_feedback_packages IS
  'Declares the feedback loop closing back to Data Acquisition (the only authorized downstream layer for CL). Persists an approved improvement declaration and its lifecycle only — never a record of having executed the change.';
CREATE TABLE continuous_learning.cl_feedback_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  feedback_package_id uuid         NOT NULL REFERENCES continuous_learning.cl_feedback_packages(id) ON DELETE RESTRICT,
  version_number      integer      NOT NULL,
  summary             text         NOT NULL,
  correlation_id      uuid         NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT cl_feedback_package_versions_unique UNIQUE (feedback_package_id, version_number)
);

COMMENT ON TABLE continuous_learning.cl_feedback_package_versions IS
  'Append-only. Historical feedback package summary versions.';
CREATE TABLE continuous_learning.cl_feedback_events (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  feedback_package_id uuid         NOT NULL REFERENCES continuous_learning.cl_feedback_packages(id) ON DELETE RESTRICT,
  event_type          text         NOT NULL CHECK (event_type IN ('dispatch','acknowledgement','rejection','revocation','replay')),
  detail              jsonb        NOT NULL DEFAULT '{}',
  occurred_at         timestamptz  NOT NULL DEFAULT now(),
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE continuous_learning.cl_feedback_events IS
  'Append-only. Publication lifecycle event log.';

INSERT INTO _migrations (filename) VALUES ('0132_create_cl_feedback_publication.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
