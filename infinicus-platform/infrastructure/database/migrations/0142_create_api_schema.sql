-- Migration: 0142_create_api_schema
-- BUILD-21 — API schema: idempotency key bookkeeping for the governed HTTP API
-- Tables: idempotency_keys
--
-- This is infrastructure bookkeeping for the HTTP layer (apps/web's Server
-- Actions and future non-workflow callers already get idempotency "for free"
-- from each domain repository's own idempotency_key columns — e.g.
-- simulation_requests, *_intake_packages) — apps/api needs a generic
-- mechanism because its routes span many different domain writes, not all
-- of which have their own idempotency column.

BEGIN;

CREATE SCHEMA IF NOT EXISTS api;

CREATE TABLE api.idempotency_keys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  idempotency_key text        NOT NULL,
  route           text        NOT NULL,
  request_hash    text        NOT NULL,
  status          text        NOT NULL DEFAULT 'in_progress',
  response_status integer,
  response_body   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_keys_status_check CHECK (status IN ('in_progress', 'completed')),
  CONSTRAINT idempotency_keys_unique UNIQUE (tenant_id, idempotency_key, route)
);

COMMENT ON TABLE api.idempotency_keys IS
  'Detects and replays duplicate HTTP requests carrying the same Idempotency-Key header for the same tenant and route. request_hash lets a key reused with a different request body be rejected as a conflict rather than silently replayed.';

INSERT INTO _migrations (filename) VALUES ('0142_create_api_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
