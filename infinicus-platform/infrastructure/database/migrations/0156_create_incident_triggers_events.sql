-- Migration: 0156_create_incident_triggers_events
-- BUILD-29 — updated_at trigger and append-only guard for the incident
-- schema.
--
-- No outbox emission here: events.outbox_events.tenant_id is NOT NULL
-- (migration 0007), so a genuinely platform-wide event (no single owning
-- tenant) cannot be represented in it without an artificial sentinel
-- tenant. platform.deployment_events (0146) and
-- platform.secret_rotation_events (0147) — the two prior platform-scoped
-- audit tables — establish the same precedent: neither emits an outbox
-- event, for the same reason. Incident declarations are observable via
-- direct query of platform.incidents/incident_updates instead (see
-- IncidentRepository), matching those two tables' own pattern.

BEGIN;

CREATE TRIGGER set_updated_at_incidents
  BEFORE UPDATE ON platform.incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only guard: platform.incident_updates ─────────────────────────────

CREATE OR REPLACE FUNCTION platform.forbid_incident_update_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'platform.incident_updates: append-only table — % is not permitted', TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

CREATE TRIGGER forbid_mutation_incident_updates
  BEFORE UPDATE OR DELETE ON platform.incident_updates
  FOR EACH ROW EXECUTE FUNCTION platform.forbid_incident_update_mutation();

INSERT INTO _migrations (filename) VALUES ('0156_create_incident_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
