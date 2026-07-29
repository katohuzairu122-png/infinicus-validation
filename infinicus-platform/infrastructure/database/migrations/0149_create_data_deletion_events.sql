-- Migration: 0149_create_data_deletion_events
-- BUILD-26 — Right-to-erasure audit: one append-only row per tenant
-- data-deletion operation (delete-tenant-data.mjs), recording which
-- tenant, when, by whom, and how many rows were removed per table.
-- Never stores the deleted data itself — only deletion metadata.
--
-- Deliberately platform-scoped, not tenant-scoped: once a tenant is
-- erased, there is no tenant_id left to scope this record to (and the
-- FK would prevent inserting one referencing an already-deleted
-- tenant). Same reasoning already applied to platform.deployment_events
-- (0146) and platform.secret_rotation_events (0147) — no RLS is applied
-- for the same reason those tables have none.

BEGIN;

CREATE TABLE platform.data_deletion_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL,
  tenant_name     text,
  deleted_by      text        NOT NULL,
  table_row_counts jsonb      NOT NULL DEFAULT '{}',
  deleted_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_deletion_events_tenant_id ON platform.data_deletion_events (tenant_id, deleted_at DESC);

COMMENT ON TABLE platform.data_deletion_events IS
  'Append-only audit trail of tenant right-to-erasure deletions: which tenant, when, by whom, and per-table row counts. Never stores the deleted data itself. Platform-scoped (no tenant FK enforcement since the tenant no longer exists after deletion), matching platform.deployment_events/secret_rotation_events.';

INSERT INTO _migrations (filename) VALUES ('0149_create_data_deletion_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
