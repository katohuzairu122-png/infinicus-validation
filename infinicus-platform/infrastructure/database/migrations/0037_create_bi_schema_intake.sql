-- Migration: 0037_create_bi_schema_intake
-- Stage 2D — Business Intelligence: schema + intake and lineage
-- Consumes validated business_operations.bo_publication_packages only.
-- No operational truth is duplicated here.

BEGIN;

CREATE SCHEMA IF NOT EXISTS business_intelligence;

-- ── business_intelligence.intelligence_intake_packages ─────────────────────────

CREATE TABLE business_intelligence.intelligence_intake_packages (
  id                         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id               uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  bo_publication_package_id  uuid          NOT NULL REFERENCES business_operations.bo_publication_packages(id) ON DELETE RESTRICT,
  intake_code                text          NOT NULL,
  domain                     text          NOT NULL CHECK (domain IN (
                                             'financial','sales_revenue','customer','marketing',
                                             'operations_productivity','inventory_supply','workforce',
                                             'market_competitive','cross_domain'
                                           )),
  status                     text          NOT NULL DEFAULT 'received' CHECK (status IN (
                                             'received','validating','validated','rejected','processed','superseded'
                                           )),
  rejection_reason           text,
  schema_version              text         NOT NULL DEFAULT '1.0',
  idempotency_key             text         NOT NULL,
  correlation_id              uuid         NOT NULL DEFAULT gen_random_uuid(),
  causation_id                 uuid,
  created_at                  timestamptz  NOT NULL DEFAULT now(),
  updated_at                  timestamptz  NOT NULL DEFAULT now(),
  created_by                  uuid         REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT intake_packages_idempotency_unique UNIQUE (business_id, idempotency_key),
  CONSTRAINT intake_packages_bo_package_unique  UNIQUE (business_id, bo_publication_package_id)
);

COMMENT ON TABLE business_intelligence.intelligence_intake_packages IS
  'Validated intake of Business Operations publication packages into Business Intelligence. Idempotent per (business_id, idempotency_key) and per (business_id, bo_publication_package_id).';

-- ── business_intelligence.intelligence_intake_package_versions (append-only) ───

CREATE TABLE business_intelligence.intelligence_intake_package_versions (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_package_id  uuid          NOT NULL REFERENCES business_intelligence.intelligence_intake_packages(id) ON DELETE RESTRICT,
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  payload_reference  jsonb         NOT NULL DEFAULT '{}',
  record_count       integer       NOT NULL DEFAULT 0,
  quality_score      numeric(5,4)  CHECK (quality_score      IS NULL OR (quality_score      BETWEEN 0 AND 1)),
  completeness_score numeric(5,4)  CHECK (completeness_score IS NULL OR (completeness_score BETWEEN 0 AND 1)),
  correlation_id     uuid          NOT NULL,
  recorded_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT intake_versions_unique UNIQUE (intake_package_id, version_number),
  CONSTRAINT intake_versions_record_count_check CHECK (record_count >= 0)
);

COMMENT ON TABLE business_intelligence.intelligence_intake_package_versions IS
  'Append-only. Historical intake versions must never be updated in place.';

-- ── business_intelligence.intelligence_source_references (append-only) ────────

CREATE TABLE business_intelligence.intelligence_source_references (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_package_id     uuid          NOT NULL REFERENCES business_intelligence.intelligence_intake_packages(id) ON DELETE RESTRICT,
  tenant_id             uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id          uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id           uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  source_system         text          NOT NULL,
  source_reference      jsonb         NOT NULL DEFAULT '{}',
  bo_handoff_record_id  uuid          REFERENCES business_operations.bo_handoff_records(id) ON DELETE SET NULL,
  recorded_at           timestamptz   NOT NULL DEFAULT now(),
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_intelligence.intelligence_source_references IS
  'Append-only. Preserves upstream lineage to Business Operations publication and handoff records.';

-- ── business_intelligence.intelligence_domain_inputs ───────────────────────────

CREATE TABLE business_intelligence.intelligence_domain_inputs (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_package_id  uuid          NOT NULL REFERENCES business_intelligence.intelligence_intake_packages(id) ON DELETE RESTRICT,
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  domain             text          NOT NULL CHECK (domain IN (
                                     'financial','sales_revenue','customer','marketing',
                                     'operations_productivity','inventory_supply','workforce',
                                     'market_competitive','cross_domain'
                                   )),
  input_reference    jsonb         NOT NULL DEFAULT '{}',
  status             text          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','mapped','rejected')),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

-- ── business_intelligence.intelligence_processing_status_history (append-only) ─

CREATE TABLE business_intelligence.intelligence_processing_status_history (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_package_id  uuid          NOT NULL REFERENCES business_intelligence.intelligence_intake_packages(id) ON DELETE RESTRICT,
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  from_status        text,
  to_status          text          NOT NULL CHECK (to_status IN (
                                     'received','validating','validated','rejected','processed','superseded'
                                   )),
  reason             text,
  actor_id           uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id     uuid          NOT NULL,
  occurred_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_intelligence.intelligence_processing_status_history IS
  'Append-only audit trail of intake lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0037_create_bi_schema_intake.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
