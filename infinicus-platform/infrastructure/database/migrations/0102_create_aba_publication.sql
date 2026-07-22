-- Migration: 0102_create_aba_publication
-- Stage 2H — Approved Business Action: publication (Group K)

BEGIN;

CREATE TABLE approved_business_action.aba_publication_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  approved_action_id  uuid          NOT NULL REFERENCES approved_business_action.approved_actions(id) ON DELETE RESTRICT,
  package_code        text          NOT NULL,
  latest_version      integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  target_layer        text          NOT NULL CHECK (target_layer IN ('outcome_monitoring')),
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
  CONSTRAINT aba_publication_packages_idempotency_unique UNIQUE (business_id, idempotency_key),
  CONSTRAINT aba_publication_packages_code_unique UNIQUE (business_id, package_code)
);

COMMENT ON TABLE approved_business_action.aba_publication_packages IS
  'Declares publication to Outcome Monitoring (the only authorized downstream layer for ABA). Persists the approved action declaration and its lifecycle only.';
CREATE TABLE approved_business_action.aba_publication_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  publication_package_id  uuid   NOT NULL REFERENCES approved_business_action.aba_publication_packages(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  summary           text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT aba_publication_package_versions_unique UNIQUE (publication_package_id, version_number)
);

COMMENT ON TABLE approved_business_action.aba_publication_package_versions IS
  'Append-only. Historical publication package summary versions.';
CREATE TABLE approved_business_action.aba_publication_events (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  publication_package_id  uuid   NOT NULL REFERENCES approved_business_action.aba_publication_packages(id) ON DELETE RESTRICT,
  event_type        text          NOT NULL CHECK (event_type IN ('dispatch','acknowledgement','rejection','revocation','replay')),
  detail            jsonb         NOT NULL DEFAULT '{}',
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.aba_publication_events IS
  'Append-only. Publication lifecycle event log.';

INSERT INTO _migrations (filename) VALUES ('0102_create_aba_publication.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
