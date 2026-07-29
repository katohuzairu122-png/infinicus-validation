-- Migration: 0002_create_extensions
-- Stage 2A — Ensure required extensions are present
-- pgcrypto was added in 0001; citext is required for case-insensitive unique columns.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

INSERT INTO _migrations (filename) VALUES ('0002_create_extensions.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
