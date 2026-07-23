-- Migration: 0155_create_incident_indexes
-- BUILD-29 — Indexes for platform.incidents / platform.incident_updates.

BEGIN;

CREATE INDEX idx_incidents_status_severity ON platform.incidents (status, severity);
CREATE INDEX idx_incidents_declared_at     ON platform.incidents (declared_at DESC);
CREATE INDEX idx_incidents_affected_tenant_ids ON platform.incidents USING gin (affected_tenant_ids);

CREATE INDEX idx_incident_updates_incident_id ON platform.incident_updates (incident_id, posted_at);

INSERT INTO _migrations (filename) VALUES ('0155_create_incident_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
