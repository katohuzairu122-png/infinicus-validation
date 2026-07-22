-- Migration: 0092_create_aba_schema_intake
-- Stage 2H — Approved Business Action: schema + intake and lineage (Group A)

BEGIN;

CREATE SCHEMA IF NOT EXISTS approved_business_action;

CREATE TABLE approved_business_action.aba_intake_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  adi_publication_package_id  uuid         NOT NULL REFERENCES ai_decision_intelligence.adi_publication_packages(id) ON DELETE RESTRICT,
  intake_code                text          NOT NULL,
  status                     text          NOT NULL DEFAULT 'received' CHECK (status IN (
                                            'received','validated','accepted','processing','completed','rejected','failed'
                                          )),
  rejection_reason           text,
  schema_version              text         NOT NULL DEFAULT '1.0',
  idempotency_key             text         NOT NULL,
  correlation_id              uuid         NOT NULL DEFAULT gen_random_uuid(),
  causation_id                 uuid,
  created_at                  timestamptz  NOT NULL DEFAULT now(),
  updated_at                  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT aba_intake_packages_idempotency_unique UNIQUE (business_id, idempotency_key),
  CONSTRAINT aba_intake_packages_adi_package_unique UNIQUE (business_id, adi_publication_package_id)
);

COMMENT ON TABLE approved_business_action.aba_intake_packages IS
  'Validated intake of ADI publication packages into Approved Business Action. Idempotent per (business_id, idempotency_key) and per (business_id, adi_publication_package_id).';
CREATE TABLE approved_business_action.aba_intake_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id  uuid          NOT NULL REFERENCES approved_business_action.aba_intake_packages(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  payload_reference  jsonb         NOT NULL DEFAULT '{}',
  record_count       integer       NOT NULL DEFAULT 0,
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT aba_intake_versions_unique UNIQUE (intake_package_id, version_number),
  CONSTRAINT aba_intake_versions_record_count_check CHECK (record_count >= 0)
);

COMMENT ON TABLE approved_business_action.aba_intake_package_versions IS
  'Append-only. Historical intake versions must never be updated in place.';
CREATE TABLE approved_business_action.aba_intake_source_references (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id     uuid          NOT NULL REFERENCES approved_business_action.aba_intake_packages(id) ON DELETE RESTRICT,
  source_system         text          NOT NULL,
  source_reference      jsonb         NOT NULL DEFAULT '{}',
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.aba_intake_source_references IS
  'Append-only. Preserves upstream lineage to ADI publication packages.';
CREATE TABLE approved_business_action.aba_intake_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id  uuid          NOT NULL REFERENCES approved_business_action.aba_intake_packages(id) ON DELETE RESTRICT,
  from_status        text,
  to_status          text          NOT NULL CHECK (to_status IN (
                                      'received','validated','accepted','processing','completed','rejected','failed'
                                    )),
  reason             text,
  actor_id           uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id     uuid          NOT NULL,
  occurred_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.aba_intake_status_history IS
  'Append-only audit trail of intake lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0092_create_aba_schema_intake.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
