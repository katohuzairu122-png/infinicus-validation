-- Migration: 0043_create_bi_anomalies
-- Stage 2D — Business Intelligence: anomaly rules and detections

BEGIN;

-- ── business_intelligence.anomaly_rules ──────────────────────────────────────────

CREATE TABLE business_intelligence.anomaly_rules (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  rule_code        text          NOT NULL,
  metric_definition_id uuid      REFERENCES business_intelligence.metric_definitions(id) ON DELETE SET NULL,
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','retired')),
  latest_version   integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT anomaly_rules_code_unique UNIQUE (business_id, rule_code)
);

-- ── business_intelligence.anomaly_rule_versions (append-only) ───────────────────

CREATE TABLE business_intelligence.anomaly_rule_versions (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_rule_id  uuid          NOT NULL REFERENCES business_intelligence.anomaly_rules(id) ON DELETE RESTRICT,
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number   integer       NOT NULL,
  detection_method text          NOT NULL CHECK (detection_method IN ('threshold','statistical_deviation','rate_of_change','pattern_match')),
  rule_specification jsonb       NOT NULL DEFAULT '{}',
  default_severity  text         NOT NULL CHECK (default_severity IN ('info','low','medium','high','critical')),
  created_at         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT anomaly_rule_versions_unique UNIQUE (anomaly_rule_id, version_number)
);

-- ── business_intelligence.anomaly_detections ─────────────────────────────────────

CREATE TABLE business_intelligence.anomaly_detections (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_rule_version_id uuid          NOT NULL REFERENCES business_intelligence.anomaly_rule_versions(id) ON DELETE RESTRICT,
  tenant_id               uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id            uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id             uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  metric_calculated_value_id uuid       REFERENCES business_intelligence.metric_calculated_values(id) ON DELETE SET NULL,
  severity                text          NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  status                  text          NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  detected_value          numeric,
  expected_range          jsonb         NOT NULL DEFAULT '{}',
  detected_at             timestamptz   NOT NULL DEFAULT now(),
  acknowledged_at         timestamptz,
  acknowledged_by         uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  resolved_at             timestamptz,
  resolution_notes        text,
  correlation_id          uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT anomaly_detections_ack_check CHECK (acknowledged_at IS NULL OR acknowledged_at >= detected_at),
  CONSTRAINT anomaly_detections_resolve_check CHECK (resolved_at IS NULL OR acknowledged_at IS NULL OR resolved_at >= acknowledged_at)
);

-- ── business_intelligence.anomaly_evidence (append-only) ────────────────────────

CREATE TABLE business_intelligence.anomaly_evidence (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_detection_id uuid          NOT NULL REFERENCES business_intelligence.anomaly_detections(id) ON DELETE RESTRICT,
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evidence_type        text          NOT NULL,
  evidence_reference    jsonb        NOT NULL DEFAULT '{}',
  created_at             timestamptz  NOT NULL DEFAULT now()
);

-- ── business_intelligence.anomaly_status_history (append-only) ──────────────────

CREATE TABLE business_intelligence.anomaly_status_history (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_detection_id uuid          NOT NULL REFERENCES business_intelligence.anomaly_detections(id) ON DELETE RESTRICT,
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  from_status          text,
  to_status            text          NOT NULL CHECK (to_status IN ('open','acknowledged','resolved','dismissed')),
  actor_id             uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  reason               text,
  correlation_id       uuid          NOT NULL,
  occurred_at          timestamptz   NOT NULL DEFAULT now(),
  created_at           timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0043_create_bi_anomalies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
