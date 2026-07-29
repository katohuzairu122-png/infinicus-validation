-- Migration: 0013_create_da_sources_connectors
-- Stage 2B — Data Acquisition schema, sources, connectors, credential refs, schedules
-- Tables: data_sources, connectors, credential_references, collection_schedules

BEGIN;

CREATE SCHEMA IF NOT EXISTS data_acquisition;

-- ── data_acquisition.data_sources ────────────────────────────────────────────

CREATE TABLE data_acquisition.data_sources (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id     uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  business_id      uuid        REFERENCES platform.businesses(id)         ON DELETE SET NULL,
  name             text        NOT NULL,
  source_code      citext      NOT NULL,
  source_type      text        NOT NULL,
  owner_type       text,
  owner_id         uuid,
  access_mode      text,
  jurisdiction     text,
  sensitivity_level text       NOT NULL DEFAULT 'internal',
  description      text,
  configuration    jsonb       NOT NULL DEFAULT '{}',
  status           text        NOT NULL DEFAULT 'draft',
  version          integer     NOT NULL DEFAULT 1,
  source_system    text        NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at       timestamptz,
  CONSTRAINT data_sources_type_check CHECK (source_type IN (
    'manual','file','document','api','database','webhook',
    'stream','application','sensor','external_dataset'
  )),
  CONSTRAINT data_sources_status_check CHECK (status IN (
    'draft','active','paused','suspended','retired','failed'
  )),
  CONSTRAINT data_sources_sensitivity_check CHECK (sensitivity_level IN (
    'public','internal','confidential','restricted','highly_restricted'
  )),
  CONSTRAINT data_sources_version_check CHECK (version > 0),
  CONSTRAINT data_sources_code_unique UNIQUE (tenant_id, workspace_id, source_code)
);

-- ── data_acquisition.connectors ──────────────────────────────────────────────
-- configuration_reference stores a secrets-manager path, never a raw credential.

CREATE TABLE data_acquisition.connectors (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenancy.tenants(id)             ON DELETE RESTRICT,
  workspace_id            uuid        NOT NULL REFERENCES tenancy.workspaces(id)          ON DELETE RESTRICT,
  data_source_id          uuid        NOT NULL REFERENCES data_acquisition.data_sources(id) ON DELETE RESTRICT,
  name                    text        NOT NULL,
  connector_type          text        NOT NULL,
  protocol                text,
  connector_version       text        NOT NULL DEFAULT '1.0',
  capabilities            jsonb       NOT NULL DEFAULT '{}',
  configuration_reference text,
  health_status           text        NOT NULL DEFAULT 'unknown',
  last_health_check_at    timestamptz,
  status                  text        NOT NULL DEFAULT 'draft',
  version                 integer     NOT NULL DEFAULT 1,
  correlation_id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at              timestamptz,
  CONSTRAINT connectors_type_check CHECK (connector_type IN (
    'rest_api','graphql','webhook','postgres','mysql','mssql','sqlite',
    'sftp','object_storage','file_upload','event_stream','custom'
  )),
  CONSTRAINT connectors_health_check CHECK (health_status IN (
    'unknown','healthy','degraded','unhealthy','offline'
  )),
  CONSTRAINT connectors_status_check CHECK (status IN (
    'draft','active','paused','suspended','retired','failed'
  )),
  CONSTRAINT connectors_version_check CHECK (version > 0)
);

-- ── data_acquisition.credential_references ───────────────────────────────────
-- Stores only a reference (path/ARN) to secrets held in an external provider.
-- Raw credentials must NEVER appear in any column of this table.

CREATE TABLE data_acquisition.credential_references (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id     uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  data_source_id   uuid        REFERENCES data_acquisition.data_sources(id)         ON DELETE RESTRICT,
  connector_id     uuid        REFERENCES data_acquisition.connectors(id)           ON DELETE RESTRICT,
  credential_name  text        NOT NULL,
  secret_provider  text        NOT NULL,
  secret_reference text        NOT NULL,
  scopes           jsonb       NOT NULL DEFAULT '[]',
  expires_at       timestamptz,
  rotation_due_at  timestamptz,
  last_rotated_at  timestamptz,
  status           text        NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  revoked_at       timestamptz,
  CONSTRAINT credential_refs_owner_check CHECK (
    data_source_id IS NOT NULL OR connector_id IS NOT NULL
  ),
  CONSTRAINT credential_refs_status_check CHECK (status IN (
    'active','expired','revoked','rotation_required'
  ))
);

-- ── data_acquisition.collection_schedules ────────────────────────────────────

CREATE TABLE data_acquisition.collection_schedules (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenancy.tenants(id)              ON DELETE RESTRICT,
  workspace_id            uuid        NOT NULL REFERENCES tenancy.workspaces(id)           ON DELETE RESTRICT,
  business_id             uuid        REFERENCES platform.businesses(id)                   ON DELETE SET NULL,
  data_source_id          uuid        NOT NULL REFERENCES data_acquisition.data_sources(id)  ON DELETE RESTRICT,
  connector_id            uuid        REFERENCES data_acquisition.connectors(id)           ON DELETE SET NULL,
  name                    text        NOT NULL,
  schedule_type           text        NOT NULL,
  cron_expression         text,
  interval_seconds        integer,
  timezone                text        NOT NULL DEFAULT 'UTC',
  collection_window_start time,
  collection_window_end   time,
  retry_limit             integer     NOT NULL DEFAULT 3,
  timeout_seconds         integer     NOT NULL DEFAULT 300,
  is_enabled              boolean     NOT NULL DEFAULT true,
  next_run_at             timestamptz,
  last_run_at             timestamptz,
  status                  text        NOT NULL DEFAULT 'active',
  version                 integer     NOT NULL DEFAULT 1,
  correlation_id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  created_by              uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at              timestamptz,
  CONSTRAINT schedules_type_check CHECK (schedule_type IN (
    'manual','cron','interval','webhook','stream','one_time'
  )),
  CONSTRAINT schedules_cron_requires_expr CHECK (
    schedule_type <> 'cron' OR cron_expression IS NOT NULL
  ),
  CONSTRAINT schedules_interval_requires_seconds CHECK (
    schedule_type <> 'interval' OR (interval_seconds IS NOT NULL AND interval_seconds > 0)
  ),
  CONSTRAINT schedules_retry_nonneg  CHECK (retry_limit >= 0),
  CONSTRAINT schedules_timeout_pos   CHECK (timeout_seconds > 0),
  CONSTRAINT schedules_version_check CHECK (version > 0),
  CONSTRAINT schedules_status_check  CHECK (status IN (
    'draft','active','paused','suspended','retired','failed'
  ))
);

INSERT INTO _migrations (filename) VALUES ('0013_create_da_sources_connectors.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
