-- Migration: 0015_create_da_schema_validation
-- Stage 2B — Schema detection and validation tables
-- Tables: detected_schemas, detected_fields,
--         validation_policies, validation_results, validation_issues

BEGIN;

-- ── data_acquisition.detected_schemas ────────────────────────────────────────

CREATE TABLE data_acquisition.detected_schemas (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id        uuid          REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id     uuid          NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  collection_run_id  uuid          REFERENCES data_acquisition.collection_runs(id)      ON DELETE SET NULL,
  schema_name        text          NOT NULL,
  schema_version     text          NOT NULL DEFAULT '1.0',
  structure          jsonb         NOT NULL DEFAULT '{}',
  sample_size        integer       NOT NULL DEFAULT 0,
  confidence         numeric(5,4)  NOT NULL DEFAULT 0,
  detection_method   text          NOT NULL,
  is_approved        boolean       NOT NULL DEFAULT false,
  approved_by        uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  approved_at        timestamptz,
  status             text          NOT NULL DEFAULT 'draft',
  correlation_id     uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT detected_schemas_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT detected_schemas_sample_nonneg    CHECK (sample_size >= 0),
  CONSTRAINT detected_schemas_status_check     CHECK (status IN (
    'draft','pending_review','approved','rejected','superseded'
  ))
);

-- ── data_acquisition.detected_fields ─────────────────────────────────────────
-- Detail records per field in a detected schema.

CREATE TABLE data_acquisition.detected_fields (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_schema_id   uuid          NOT NULL REFERENCES data_acquisition.detected_schemas(id) ON DELETE CASCADE,
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  field_path           text          NOT NULL,
  inferred_type        text          NOT NULL,
  is_nullable          boolean       NOT NULL DEFAULT true,
  observed_count       integer       NOT NULL DEFAULT 0,
  null_count           integer       NOT NULL DEFAULT 0,
  distinct_count       integer,
  minimum_value        jsonb,
  maximum_value        jsonb,
  sample_values        jsonb         NOT NULL DEFAULT '[]',
  confidence           numeric(5,4)  NOT NULL DEFAULT 0,
  status               text          NOT NULL DEFAULT 'active',
  created_at           timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT detected_fields_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT detected_fields_counts_nonneg    CHECK (observed_count >= 0 AND null_count >= 0),
  CONSTRAINT detected_fields_null_lte_obs     CHECK (null_count <= observed_count),
  CONSTRAINT detected_fields_path_unique      UNIQUE (detected_schema_id, field_path)
);

-- ── data_acquisition.validation_policies ─────────────────────────────────────

CREATE TABLE data_acquisition.validation_policies (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id         uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  business_id          uuid        REFERENCES platform.businesses(id)         ON DELETE SET NULL,
  name                 text        NOT NULL,
  code                 citext      NOT NULL,
  schema_reference_id  uuid        REFERENCES data_acquisition.detected_schemas(id) ON DELETE SET NULL,
  rules                jsonb       NOT NULL DEFAULT '[]',
  severity_default     text        NOT NULL DEFAULT 'warning',
  is_active            boolean     NOT NULL DEFAULT true,
  version              integer     NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT validation_policies_severity_check  CHECK (severity_default IN (
    'info','warning','error','critical'
  )),
  CONSTRAINT validation_policies_version_check   CHECK (version > 0),
  CONSTRAINT validation_policies_code_unique     UNIQUE (tenant_id, workspace_id, code)
);

-- ── data_acquisition.validation_results ──────────────────────────────────────

CREATE TABLE data_acquisition.validation_results (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id         uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id          uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  collection_run_id    uuid        NOT NULL REFERENCES data_acquisition.collection_runs(id) ON DELETE RESTRICT,
  validation_policy_id uuid        REFERENCES data_acquisition.validation_policies(id)  ON DELETE SET NULL,
  record_reference     text,
  is_valid             boolean     NOT NULL,
  error_count          integer     NOT NULL DEFAULT 0,
  warning_count        integer     NOT NULL DEFAULT 0,
  result_details       jsonb       NOT NULL DEFAULT '{}',
  validated_at         timestamptz NOT NULL DEFAULT now(),
  correlation_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT validation_results_counts_nonneg CHECK (error_count >= 0 AND warning_count >= 0)
);

-- ── data_acquisition.validation_issues ───────────────────────────────────────
-- Append-only per-issue records (immutable after creation).

CREATE TABLE data_acquisition.validation_issues (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_result_id uuid        NOT NULL REFERENCES data_acquisition.validation_results(id) ON DELETE CASCADE,
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  rule_code            text        NOT NULL,
  field_path           text,
  severity             text        NOT NULL,
  issue_type           text        NOT NULL,
  message              text        NOT NULL,
  observed_value       jsonb,
  expected_value       jsonb,
  resolution_status    text        NOT NULL DEFAULT 'open',
  created_at           timestamptz NOT NULL DEFAULT now(),
  resolved_at          timestamptz,
  resolved_by          uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT validation_issues_severity_check    CHECK (severity IN (
    'info','warning','error','critical'
  )),
  CONSTRAINT validation_issues_resolution_check  CHECK (resolution_status IN (
    'open','resolved','accepted','ignored','superseded'
  ))
);

INSERT INTO _migrations (filename) VALUES ('0015_create_da_schema_validation.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
