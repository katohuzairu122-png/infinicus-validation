-- Migration: 0016_create_da_cleaning_normalization
-- Stage 2B — Cleaning and normalization tables
-- Tables: cleaning_runs, cleaning_actions, normalization_runs, normalization_mappings

BEGIN;

-- ── data_acquisition.cleaning_runs ───────────────────────────────────────────

CREATE TABLE data_acquisition.cleaning_runs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id         uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id          uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  collection_run_id    uuid        NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  policy_reference     text,
  operations           jsonb       NOT NULL DEFAULT '[]',
  records_processed    integer     NOT NULL DEFAULT 0,
  records_modified     integer     NOT NULL DEFAULT 0,
  records_quarantined  integer     NOT NULL DEFAULT 0,
  before_hash          text,
  after_hash           text,
  status               text        NOT NULL DEFAULT 'pending',
  correlation_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  started_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cleaning_runs_status_check CHECK (status IN (
    'pending','running','completed','failed','cancelled'
  )),
  CONSTRAINT cleaning_runs_counts_nonneg CHECK (
    records_processed >= 0 AND records_modified >= 0 AND records_quarantined >= 0
  ),
  CONSTRAINT cleaning_runs_modified_lte_processed CHECK (
    records_modified <= records_processed
  ),
  CONSTRAINT cleaning_runs_quarantined_lte_processed CHECK (
    records_quarantined <= records_processed
  )
);

-- ── data_acquisition.cleaning_actions ────────────────────────────────────────
-- Append-only evidence log. before_value must never be destroyed.

CREATE TABLE data_acquisition.cleaning_actions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaning_run_id  uuid        NOT NULL REFERENCES data_acquisition.cleaning_runs(id) ON DELETE CASCADE,
  tenant_id        uuid        NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  record_reference text,
  field_path       text,
  action_type      text        NOT NULL,
  before_value     jsonb,
  after_value      jsonb,
  reason           text        NOT NULL,
  confidence       numeric(5,4),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cleaning_actions_confidence_check CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
  ),
  CONSTRAINT cleaning_actions_action_type_check CHECK (action_type IN (
    'trim','strip','replace','remove','fill','cast','merge','split',
    'deduplicate','quarantine','flag','standardize'
  ))
);

-- ── data_acquisition.normalization_runs ──────────────────────────────────────

CREATE TABLE data_acquisition.normalization_runs (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id            uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id             uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  collection_run_id       uuid        NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  normalization_profile   text        NOT NULL,
  operations              jsonb       NOT NULL DEFAULT '[]',
  records_processed       integer     NOT NULL DEFAULT 0,
  records_normalized      integer     NOT NULL DEFAULT 0,
  status                  text        NOT NULL DEFAULT 'pending',
  correlation_id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  started_at              timestamptz NOT NULL DEFAULT now(),
  completed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT normalization_runs_status_check CHECK (status IN (
    'pending','running','completed','failed','cancelled'
  )),
  CONSTRAINT normalization_runs_counts_nonneg CHECK (
    records_processed >= 0 AND records_normalized >= 0
  ),
  CONSTRAINT normalization_runs_normalized_lte_processed CHECK (
    records_normalized <= records_processed
  )
);

-- ── data_acquisition.normalization_mappings ──────────────────────────────────

CREATE TABLE data_acquisition.normalization_mappings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id     uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  mapping_type     text        NOT NULL,
  source_value     text        NOT NULL,
  canonical_value  text        NOT NULL,
  locale           text,
  unit_from        text,
  unit_to          text,
  currency_from    text,
  currency_to      text,
  effective_from   timestamptz,
  effective_to     timestamptz,
  status           text        NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT normalization_mappings_mapping_type_check CHECK (mapping_type IN (
    'locale','unit','currency','category','alias','format','enum'
  )),
  CONSTRAINT normalization_mappings_status_check CHECK (status IN (
    'active','inactive','superseded'
  )),
  CONSTRAINT normalization_mappings_effective_order CHECK (
    effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
  )
);

INSERT INTO _migrations (filename) VALUES ('0016_create_da_cleaning_normalization.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
