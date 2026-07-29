-- Migration: 0018_create_da_quality_provenance
-- Stage 2B — Quality scoring, missing-data, reliability, and provenance tables
-- Tables: data_quality_scores, missing_data_actions, source_reliability_scores,
--         provenance_records, transformation_records

BEGIN;

-- ── data_acquisition.data_quality_scores ─────────────────────────────────────

CREATE TABLE data_acquisition.data_quality_scores (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id         uuid          REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id      uuid          NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  collection_run_id   uuid          REFERENCES data_acquisition.collection_runs(id)      ON DELETE SET NULL,
  scope_type          text          NOT NULL DEFAULT 'run',
  scope_reference     text,
  completeness        numeric(5,4)  NOT NULL,
  validity            numeric(5,4)  NOT NULL,
  consistency         numeric(5,4)  NOT NULL,
  timeliness          numeric(5,4)  NOT NULL,
  uniqueness          numeric(5,4)  NOT NULL,
  conformity          numeric(5,4)  NOT NULL,
  overall_score       numeric(5,4)  NOT NULL,
  weights             jsonb         NOT NULL DEFAULT '{}',
  score_details       jsonb         NOT NULL DEFAULT '{}',
  scored_at           timestamptz   NOT NULL DEFAULT now(),
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dqs_scope_type_check    CHECK (scope_type IN ('run','source','record','field','dataset')),
  CONSTRAINT dqs_completeness_check  CHECK (completeness  >= 0 AND completeness  <= 1),
  CONSTRAINT dqs_validity_check      CHECK (validity      >= 0 AND validity      <= 1),
  CONSTRAINT dqs_consistency_check   CHECK (consistency   >= 0 AND consistency   <= 1),
  CONSTRAINT dqs_timeliness_check    CHECK (timeliness    >= 0 AND timeliness    <= 1),
  CONSTRAINT dqs_uniqueness_check    CHECK (uniqueness    >= 0 AND uniqueness    <= 1),
  CONSTRAINT dqs_conformity_check    CHECK (conformity    >= 0 AND conformity    <= 1),
  CONSTRAINT dqs_overall_check       CHECK (overall_score >= 0 AND overall_score <= 1)
);

-- ── data_acquisition.missing_data_actions ────────────────────────────────────

CREATE TABLE data_acquisition.missing_data_actions (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id       uuid          REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  collection_run_id uuid          NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  record_reference  text,
  field_path        text          NOT NULL,
  missingness_type  text          NOT NULL,
  action_type       text          NOT NULL,
  imputed_value     jsonb,
  confidence        numeric(5,4),
  reason            text          NOT NULL,
  status            text          NOT NULL DEFAULT 'pending',
  performed_at      timestamptz,
  performed_by      uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT missing_data_action_type_check CHECK (action_type IN (
    'impute','defer','quarantine','reject','request_source','accept_missing'
  )),
  CONSTRAINT missing_data_missingness_check CHECK (missingness_type IN (
    'mcar','mar','mnar','structural','unknown'
  )),
  CONSTRAINT missing_data_status_check CHECK (status IN (
    'pending','completed','rejected','deferred'
  )),
  CONSTRAINT missing_data_confidence_check CHECK (
    confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
  )
);

-- ── data_acquisition.source_reliability_scores ───────────────────────────────

CREATE TABLE data_acquisition.source_reliability_scores (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id          uuid          REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id       uuid          NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  period_start         timestamptz   NOT NULL,
  period_end           timestamptz   NOT NULL,
  quality_score        numeric(5,4)  NOT NULL,
  timeliness_score     numeric(5,4)  NOT NULL,
  availability_score   numeric(5,4)  NOT NULL,
  consistency_score    numeric(5,4)  NOT NULL,
  verification_score   numeric(5,4)  NOT NULL,
  failure_rate         numeric(5,4)  NOT NULL,
  overall_reliability  numeric(5,4)  NOT NULL,
  score_details        jsonb         NOT NULL DEFAULT '{}',
  status               text          NOT NULL DEFAULT 'active',
  scored_at            timestamptz   NOT NULL DEFAULT now(),
  correlation_id       uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT srs_period_order          CHECK (period_start < period_end),
  CONSTRAINT srs_quality_check         CHECK (quality_score        >= 0 AND quality_score        <= 1),
  CONSTRAINT srs_timeliness_check      CHECK (timeliness_score     >= 0 AND timeliness_score     <= 1),
  CONSTRAINT srs_availability_check    CHECK (availability_score   >= 0 AND availability_score   <= 1),
  CONSTRAINT srs_consistency_check     CHECK (consistency_score    >= 0 AND consistency_score    <= 1),
  CONSTRAINT srs_verification_check   CHECK (verification_score   >= 0 AND verification_score   <= 1),
  CONSTRAINT srs_failure_rate_check    CHECK (failure_rate         >= 0 AND failure_rate         <= 1),
  CONSTRAINT srs_overall_check         CHECK (overall_reliability  >= 0 AND overall_reliability  <= 1),
  CONSTRAINT srs_status_check          CHECK (status IN ('active','superseded','archived'))
);

-- ── data_acquisition.provenance_records ──────────────────────────────────────
-- Immutable after creation through the application role.
-- self-parent blocked; lineage_depth non-negative.

CREATE TABLE data_acquisition.provenance_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id          uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id           uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id        uuid        NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  collection_run_id     uuid        REFERENCES data_acquisition.collection_runs(id)      ON DELETE SET NULL,
  record_reference      text        NOT NULL,
  source_reference      text        NOT NULL,
  source_hash           text,
  transformation_chain  jsonb       NOT NULL DEFAULT '[]',
  evidence_references   jsonb       NOT NULL DEFAULT '[]',
  parent_provenance_id  uuid        REFERENCES data_acquisition.provenance_records(id)   ON DELETE RESTRICT,
  lineage_depth         integer     NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  correlation_id        uuid        NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT provenance_records_no_self_parent CHECK (id <> parent_provenance_id),
  CONSTRAINT provenance_records_depth_nonneg   CHECK (lineage_depth >= 0)
);

-- ── data_acquisition.transformation_records ──────────────────────────────────
-- Append-only transformation evidence.

CREATE TABLE data_acquisition.transformation_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provenance_record_id  uuid        NOT NULL REFERENCES data_acquisition.provenance_records(id) ON DELETE CASCADE,
  transformation_type   text        NOT NULL,
  transformation_version text       NOT NULL DEFAULT '1.0',
  input_hash            text,
  output_hash           text,
  parameters            jsonb       NOT NULL DEFAULT '{}',
  performed_by_type     text        NOT NULL,
  performed_by_id       uuid,
  performed_at          timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transformation_records_performed_by_type_check CHECK (performed_by_type IN (
    'user','service_account','system','pipeline'
  ))
);

INSERT INTO _migrations (filename) VALUES ('0018_create_da_quality_provenance.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
