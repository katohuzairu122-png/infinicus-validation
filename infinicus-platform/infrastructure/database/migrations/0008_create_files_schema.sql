-- Migration: 0008_create_files_schema
-- Stage 2A — Files schema: object storage metadata (no binary content in PG)
-- Tables: file_objects, file_versions, file_links, file_access_events
-- Also back-fills the FK from identity.user_profiles → files.file_objects.

BEGIN;

CREATE SCHEMA IF NOT EXISTS files;

-- ── files.file_objects ───────────────────────────────────────────────────────
-- Metadata only. Binary content lives in object storage (S3/R2/GCS).

CREATE TABLE files.file_objects (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id      uuid        REFERENCES tenancy.workspaces(id)          ON DELETE RESTRICT,
  business_id       uuid,
  storage_provider  text        NOT NULL,
  bucket_name       text        NOT NULL,
  object_key        text        NOT NULL,
  original_filename text        NOT NULL,
  media_type        text        NOT NULL,
  size_bytes        bigint      NOT NULL,
  sha256_hash       text        NOT NULL,
  classification    text        NOT NULL DEFAULT 'internal',
  status            text        NOT NULL DEFAULT 'active',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at        timestamptz,
  CONSTRAINT file_objects_status_check CHECK (status IN ('active','archived','deleted'))
);

-- ── files.file_versions ──────────────────────────────────────────────────────

CREATE TABLE files.file_versions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_object_id uuid        NOT NULL REFERENCES files.file_objects(id) ON DELETE CASCADE,
  version        integer     NOT NULL,
  object_key     text        NOT NULL,
  size_bytes     bigint      NOT NULL,
  sha256_hash    text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT file_versions_unique UNIQUE (file_object_id, version)
);

-- ── files.file_links ─────────────────────────────────────────────────────────

CREATE TABLE files.file_links (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_object_id    uuid        NOT NULL REFERENCES files.file_objects(id) ON DELETE CASCADE,
  entity_type       text        NOT NULL,
  entity_id         uuid        NOT NULL,
  relationship_type text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES identity.users(id) ON DELETE SET NULL
);

-- ── files.file_access_events ─────────────────────────────────────────────────
-- Append-only access trail.

CREATE TABLE files.file_access_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_object_id uuid        NOT NULL REFERENCES files.file_objects(id) ON DELETE CASCADE,
  tenant_id      uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  user_id        uuid        REFERENCES identity.users(id)              ON DELETE SET NULL,
  access_type    text        NOT NULL,
  ip_address     inet,
  metadata       jsonb       NOT NULL DEFAULT '{}',
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Back-fill FK: identity.user_profiles → files.file_objects ────────────────

ALTER TABLE identity.user_profiles
  ADD CONSTRAINT user_profiles_avatar_fk
  FOREIGN KEY (avatar_file_id) REFERENCES files.file_objects(id) ON DELETE SET NULL;

INSERT INTO _migrations (filename) VALUES ('0008_create_files_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
