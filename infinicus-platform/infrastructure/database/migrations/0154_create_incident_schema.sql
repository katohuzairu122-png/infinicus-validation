-- Migration: 0154_create_incident_schema
-- BUILD-29 — Incident response: a real, auditable record of declared
-- incidents and their timeline of updates.
--
-- Deliberately platform-scoped, not tenant-scoped: an incident record is
-- operational metadata (what happened, when, who's responding, what the
-- status is) managed by the operating team, not tenant business data —
-- the same reasoning platform.deployment_events (migration 0146) already
-- established. affected_tenant_ids is a plain uuid[] column (not a
-- tenant_id FK/RLS scope) so a single incident that impacts multiple
-- tenants is one record, and so the incident record itself remains
-- visible to operators regardless of tenant — RLS would be actively
-- wrong here, hiding a multi-tenant incident from anyone without every
-- affected tenant's context simultaneously.

BEGIN;

CREATE TABLE platform.incidents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  severity            text        NOT NULL,
  title               text        NOT NULL,
  description         text        NOT NULL,
  status              text        NOT NULL DEFAULT 'investigating',
  affected_systems    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  affected_tenant_ids uuid[]      NOT NULL DEFAULT '{}',
  declared_by         text        NOT NULL,
  postmortem_url      text,
  correlation_id      uuid        NOT NULL DEFAULT gen_random_uuid(),
  declared_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incidents_severity_check CHECK (severity IN ('sev1', 'sev2', 'sev3', 'sev4')),
  CONSTRAINT incidents_status_check CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  CONSTRAINT incidents_resolved_at_consistency CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL) OR (status <> 'resolved' AND resolved_at IS NULL)
  )
);

COMMENT ON TABLE platform.incidents IS
  'One row per declared incident. Platform-scoped (no RLS) — matches platform.deployment_events, an operator/on-call artifact, not tenant data. See docs/incident-response/severity-model.md for what sev1-4 mean.';

-- ── platform.incident_updates ────────────────────────────────────────────────
-- Append-only timeline entries (forbid_mutation trigger, migration 0156) —
-- the public/internal status-page-style narrative of an incident as it
-- unfolds, matching every other domain's *_status_history convention but
-- carrying a human message, not just a state transition.

CREATE TABLE platform.incident_updates (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         uuid        NOT NULL REFERENCES platform.incidents(id) ON DELETE RESTRICT,
  message             text        NOT NULL,
  status_at_update     text        NOT NULL,
  is_customer_facing  boolean     NOT NULL DEFAULT false,
  posted_by           text        NOT NULL,
  correlation_id      uuid        NOT NULL DEFAULT gen_random_uuid(),
  posted_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incident_updates_status_at_update_check CHECK (status_at_update IN ('investigating', 'identified', 'monitoring', 'resolved'))
);

COMMENT ON TABLE platform.incident_updates IS
  'Append-only timeline of an incident''s progress. is_customer_facing marks entries suitable for a public status page (see communication-templates.md); internal-only entries (false) are for the on-call/response team.';

INSERT INTO _migrations (filename) VALUES ('0154_create_incident_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
