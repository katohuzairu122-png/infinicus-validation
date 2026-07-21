-- Migration: 0038_create_bi_datasets
-- Stage 2D — Business Intelligence: analytical datasets and versions

BEGIN;

-- ── business_intelligence.analytical_datasets ───────────────────────────────────

CREATE TABLE business_intelligence.analytical_datasets (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dataset_code    text          NOT NULL,
  domain          text          NOT NULL CHECK (domain IN (
                                  'financial','sales_revenue','customer','marketing',
                                  'operations_productivity','inventory_supply','workforce',
                                  'market_competitive','cross_domain'
                                )),
  name            text          NOT NULL,
  description     text,
  status          text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','deprecated','retired')),
  latest_version  integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT analytical_datasets_code_unique UNIQUE (business_id, dataset_code)
);

-- ── business_intelligence.analytical_dataset_versions (append-only, immutable) ─

CREATE TABLE business_intelligence.analytical_dataset_versions (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id          uuid          NOT NULL REFERENCES business_intelligence.analytical_datasets(id) ON DELETE RESTRICT,
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number      integer       NOT NULL,
  schema_reference    jsonb         NOT NULL DEFAULT '{}',
  effective_start     timestamptz   NOT NULL,
  effective_end       timestamptz,
  quality_score       numeric(5,4)  CHECK (quality_score      IS NULL OR (quality_score      BETWEEN 0 AND 1)),
  completeness_score  numeric(5,4)  CHECK (completeness_score IS NULL OR (completeness_score BETWEEN 0 AND 1)),
  publication_status  text          NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','superseded')),
  intake_package_id   uuid          REFERENCES business_intelligence.intelligence_intake_packages(id) ON DELETE SET NULL,
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dataset_versions_unique UNIQUE (dataset_id, version_number),
  CONSTRAINT dataset_versions_period_check CHECK (effective_end IS NULL OR effective_end > effective_start)
);

COMMENT ON TABLE business_intelligence.analytical_dataset_versions IS
  'Append-only. Immutable once created — corrections publish a new version, never mutate history.';

-- ── business_intelligence.dataset_lineage (append-only) ────────────────────────

CREATE TABLE business_intelligence.dataset_lineage (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id          uuid          NOT NULL REFERENCES business_intelligence.analytical_dataset_versions(id) ON DELETE RESTRICT,
  tenant_id                   uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  parent_dataset_version_id   uuid          REFERENCES business_intelligence.analytical_dataset_versions(id) ON DELETE SET NULL,
  source_reference_id         uuid          REFERENCES business_intelligence.intelligence_source_references(id) ON DELETE SET NULL,
  lineage_type                text          NOT NULL CHECK (lineage_type IN (
                                              'derived_from','aggregated_from','joined_from','filtered_from'
                                            )),
  created_at                  timestamptz   NOT NULL DEFAULT now()
);

-- ── business_intelligence.dataset_data_references ───────────────────────────────

CREATE TABLE business_intelligence.dataset_data_references (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id   uuid          NOT NULL REFERENCES business_intelligence.analytical_dataset_versions(id) ON DELETE RESTRICT,
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  reference_type       text          NOT NULL,
  reference            jsonb         NOT NULL DEFAULT '{}',
  record_count         integer       NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  created_at           timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0038_create_bi_datasets.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
