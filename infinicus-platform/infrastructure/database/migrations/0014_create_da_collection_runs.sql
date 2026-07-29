-- Migration: 0014_create_da_collection_runs
-- Stage 2B — Collection run tables and intake variants
-- Tables: collection_runs, webhook_receipts, file_intakes,
--         api_collection_runs, database_collection_runs,
--         manual_submissions, stream_events

BEGIN;

-- ── data_acquisition.collection_runs ─────────────────────────────────────────

CREATE TABLE data_acquisition.collection_runs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id      uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id       uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id    uuid        NOT NULL REFERENCES data_acquisition.data_sources(id)  ON DELETE RESTRICT,
  connector_id      uuid        REFERENCES data_acquisition.connectors(id)           ON DELETE SET NULL,
  schedule_id       uuid        REFERENCES data_acquisition.collection_schedules(id) ON DELETE SET NULL,
  collection_type   text        NOT NULL,
  state             text        NOT NULL DEFAULT 'planned',
  started_at        timestamptz,
  completed_at      timestamptz,
  checkpoint        jsonb       NOT NULL DEFAULT '{}',
  request_metadata  jsonb       NOT NULL DEFAULT '{}',
  response_metadata jsonb       NOT NULL DEFAULT '{}',
  records_received  integer     NOT NULL DEFAULT 0,
  records_accepted  integer     NOT NULL DEFAULT 0,
  records_rejected  integer     NOT NULL DEFAULT 0,
  bytes_received    bigint      NOT NULL DEFAULT 0,
  error_code        text,
  error_message     text,
  attempt_number    integer     NOT NULL DEFAULT 1,
  correlation_id    uuid        NOT NULL DEFAULT gen_random_uuid(),
  causation_id      uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT collection_runs_type_check CHECK (collection_type IN (
    'webhook','file','document','api','database','manual','stream'
  )),
  CONSTRAINT collection_runs_state_check CHECK (state IN (
    'planned','scheduled','collecting','collected',
    'validated','published','failed','quarantined','cancelled'
  )),
  CONSTRAINT collection_runs_counts_nonneg CHECK (
    records_received >= 0 AND records_accepted >= 0 AND records_rejected >= 0
  ),
  CONSTRAINT collection_runs_counts_coherent CHECK (
    records_accepted + records_rejected <= records_received
  ),
  CONSTRAINT collection_runs_bytes_nonneg CHECK (bytes_received >= 0),
  CONSTRAINT collection_runs_attempt_pos  CHECK (attempt_number >= 1)
);

-- ── data_acquisition.webhook_receipts ────────────────────────────────────────
-- Append-only receipt evidence. Payload is immutable after storage.

CREATE TABLE data_acquisition.webhook_receipts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id      uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id       uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id    uuid        NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  connector_id      uuid        REFERENCES data_acquisition.connectors(id)           ON DELETE SET NULL,
  collection_run_id uuid        NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  external_event_id text,
  request_id        text,
  signature_status  text        NOT NULL DEFAULT 'pending',
  idempotency_key   text        NOT NULL,
  headers           jsonb       NOT NULL DEFAULT '{}',
  payload           jsonb       NOT NULL DEFAULT '{}',
  payload_hash      text        NOT NULL,
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  status            text        NOT NULL DEFAULT 'received',
  correlation_id    uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_receipts_sig_check CHECK (signature_status IN (
    'not_required','pending','valid','invalid'
  )),
  CONSTRAINT webhook_receipts_status_check CHECK (status IN (
    'received','processing','processed','rejected','failed'
  )),
  CONSTRAINT webhook_receipts_invalid_not_processed CHECK (
    signature_status <> 'invalid' OR processed_at IS NULL
  ),
  CONSTRAINT webhook_receipts_idempotency UNIQUE (data_source_id, idempotency_key)
);

-- ── data_acquisition.file_intakes ────────────────────────────────────────────
-- Metadata only. Binary content lives in files.file_objects (object storage).

CREATE TABLE data_acquisition.file_intakes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id         uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id          uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id       uuid        NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  collection_run_id    uuid        NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  file_object_id       uuid        NOT NULL REFERENCES files.file_objects(id)           ON DELETE RESTRICT,
  document_type        text,
  original_filename    text        NOT NULL,
  media_type           text        NOT NULL,
  size_bytes           bigint      NOT NULL,
  sha256_hash          text        NOT NULL,
  malware_scan_status  text        NOT NULL DEFAULT 'pending',
  parse_status         text        NOT NULL DEFAULT 'pending',
  page_count           integer,
  metadata             jsonb       NOT NULL DEFAULT '{}',
  status               text        NOT NULL DEFAULT 'received',
  correlation_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT file_intakes_scan_check  CHECK (malware_scan_status IN (
    'pending','clean','infected','failed','not_supported'
  )),
  CONSTRAINT file_intakes_parse_check CHECK (parse_status IN (
    'pending','parsed','partially_parsed','failed','not_required'
  )),
  CONSTRAINT file_intakes_size_nonneg CHECK (size_bytes >= 0)
);

-- ── data_acquisition.api_collection_runs ─────────────────────────────────────
-- Detail record for API-type runs. No access tokens stored.

CREATE TABLE data_acquisition.api_collection_runs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_run_id    uuid        NOT NULL UNIQUE REFERENCES data_acquisition.collection_runs(id) ON DELETE CASCADE,
  http_method          text        NOT NULL,
  endpoint_reference   text        NOT NULL,
  request_parameters   jsonb       NOT NULL DEFAULT '{}',
  pagination_strategy  text        NOT NULL DEFAULT 'none',
  pages_requested      integer     NOT NULL DEFAULT 0,
  pages_completed      integer     NOT NULL DEFAULT 0,
  rate_limit_remaining integer,
  rate_limit_reset_at  timestamptz,
  response_status      integer,
  response_hash        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_runs_method_check   CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE')),
  CONSTRAINT api_runs_pages_nonneg   CHECK (pages_requested >= 0 AND pages_completed >= 0)
);

-- ── data_acquisition.database_collection_runs ────────────────────────────────
-- Detail record for DB-type runs. No raw connection strings or passwords.

CREATE TABLE data_acquisition.database_collection_runs (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_run_id     uuid        NOT NULL UNIQUE REFERENCES data_acquisition.collection_runs(id) ON DELETE CASCADE,
  database_type         text        NOT NULL,
  query_reference       text        NOT NULL,
  checkpoint_before     jsonb       NOT NULL DEFAULT '{}',
  checkpoint_after      jsonb       NOT NULL DEFAULT '{}',
  batch_size            integer     NOT NULL DEFAULT 1000,
  batches_completed     integer     NOT NULL DEFAULT 0,
  rows_read             bigint      NOT NULL DEFAULT 0,
  transaction_isolation text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT db_runs_batch_pos    CHECK (batch_size > 0),
  CONSTRAINT db_runs_counts_nonneg CHECK (batches_completed >= 0 AND rows_read >= 0)
);

-- ── data_acquisition.manual_submissions ──────────────────────────────────────

CREATE TABLE data_acquisition.manual_submissions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id         uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id          uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id       uuid        NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  collection_run_id    uuid        NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  submitted_by         uuid        REFERENCES identity.users(id)                        ON DELETE SET NULL,
  submission_type      text        NOT NULL,
  payload              jsonb       NOT NULL DEFAULT '{}',
  revision_number      integer     NOT NULL DEFAULT 1,
  parent_submission_id uuid        REFERENCES data_acquisition.manual_submissions(id)   ON DELETE SET NULL,
  submission_notes     text,
  status               text        NOT NULL DEFAULT 'submitted',
  correlation_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_submissions_revision_check  CHECK (revision_number >= 1),
  CONSTRAINT manual_submissions_no_self_parent  CHECK (id <> parent_submission_id),
  CONSTRAINT manual_submissions_status_check    CHECK (status IN (
    'submitted','reviewing','accepted','rejected','superseded'
  ))
);

-- ── data_acquisition.stream_events ───────────────────────────────────────────
-- Append-only stream event log. Payload immutable after insertion.

CREATE TABLE data_acquisition.stream_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id      uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id       uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id    uuid        NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  collection_run_id uuid        REFERENCES data_acquisition.collection_runs(id)      ON DELETE SET NULL,
  stream_name       text        NOT NULL,
  partition_key     text,
  partition_number  integer,
  event_offset      bigint,
  external_event_id text,
  event_time        timestamptz NOT NULL,
  received_at       timestamptz NOT NULL DEFAULT now(),
  payload           jsonb       NOT NULL DEFAULT '{}',
  payload_hash      text        NOT NULL,
  ordering_key      text,
  replay_status     text        NOT NULL DEFAULT 'original',
  status            text        NOT NULL DEFAULT 'received',
  correlation_id    uuid        NOT NULL DEFAULT gen_random_uuid(),
  causation_id      uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stream_events_replay_check  CHECK (replay_status IN ('original','replayed','cancelled')),
  CONSTRAINT stream_events_status_check  CHECK (status IN (
    'received','processing','processed','failed','quarantined'
  ))
);

-- Conditional unique for idempotent stream event consumption
CREATE UNIQUE INDEX stream_events_ext_id_unique
  ON data_acquisition.stream_events (data_source_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

INSERT INTO _migrations (filename) VALUES ('0014_create_da_collection_runs.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
