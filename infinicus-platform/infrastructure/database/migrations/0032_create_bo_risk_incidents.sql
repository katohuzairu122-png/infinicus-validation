-- Migration: 0032_create_bo_risk_incidents
-- Stage 2C — Compliance controls, risk assessments, incidents, incident escalations (append-only)

BEGIN;

-- ── business_operations.compliance_controls ───────────────────────────────────

CREATE TABLE business_operations.compliance_controls (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  control_code      text          NOT NULL,
  control_name      text          NOT NULL,
  control_type      text          NOT NULL DEFAULT 'preventive' CHECK (control_type IN (
                                    'preventive','detective','corrective','directive'
                                  )),
  framework         text,
  description       text          NOT NULL,
  owner_id          uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  review_frequency  text          NOT NULL DEFAULT 'annually' CHECK (review_frequency IN (
                                    'monthly','quarterly','semi_annually','annually','as_needed'
                                  )),
  last_reviewed_at  timestamptz,
  next_review_date  date,
  control_status    text          NOT NULL DEFAULT 'active' CHECK (control_status IN (
                                    'draft','active','under_review','suspended','retired'
                                  )),
  status            text          NOT NULL DEFAULT 'active',
  version           integer       NOT NULL DEFAULT 1,
  source_system     text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  created_by        uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT compliance_controls_code_business_unique UNIQUE (business_id, control_code)
);

-- ── business_operations.risk_assessments ─────────────────────────────────────

CREATE TABLE business_operations.risk_assessments (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  assessment_code     text          NOT NULL,
  risk_title          text          NOT NULL,
  risk_category       text          NOT NULL CHECK (risk_category IN (
                                      'operational','financial','strategic','compliance',
                                      'reputational','technology','supply_chain','other'
                                    )),
  likelihood          integer       NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact              integer       NOT NULL CHECK (impact BETWEEN 1 AND 5),
  risk_score          integer       GENERATED ALWAYS AS (likelihood * impact) STORED,
  risk_level          text          NOT NULL DEFAULT 'medium' CHECK (risk_level IN (
                                      'critical','high','medium','low'
                                    )),
  description         text          NOT NULL,
  mitigation_plan     text,
  control_id          uuid          REFERENCES business_operations.compliance_controls(id) ON DELETE SET NULL,
  owner_id            uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  assessment_status   text          NOT NULL DEFAULT 'open' CHECK (assessment_status IN (
                                      'open','mitigating','accepted','closed'
                                    )),
  reviewed_at         timestamptz,
  next_review_date    date,
  status              text          NOT NULL DEFAULT 'active',
  version             integer       NOT NULL DEFAULT 1,
  source_system       text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id      uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  created_by          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT risk_assessments_code_business_unique UNIQUE (business_id, assessment_code)
);

-- ── business_operations.incidents ────────────────────────────────────────────

CREATE TABLE business_operations.incidents (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  incident_code     text          NOT NULL,
  title             text          NOT NULL,
  description       text,
  incident_type     text          NOT NULL CHECK (incident_type IN (
                                    'safety','quality','security','data_breach','service_outage',
                                    'compliance','environmental','financial','operational','other'
                                  )),
  severity          text          NOT NULL DEFAULT 'medium' CHECK (severity IN (
                                    'critical','high','medium','low'
                                  )),
  incident_status   text          NOT NULL DEFAULT 'open' CHECK (incident_status IN (
                                    'open','investigating','contained','resolved','closed'
                                  )),
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  detected_at       timestamptz,
  contained_at      timestamptz,
  resolved_at       timestamptz,
  reported_by       uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  assigned_to       uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  risk_assessment_id uuid         REFERENCES business_operations.risk_assessments(id) ON DELETE SET NULL,
  root_cause        text,
  corrective_actions text,
  customer_impacted boolean       NOT NULL DEFAULT false,
  status            text          NOT NULL DEFAULT 'active',
  version           integer       NOT NULL DEFAULT 1,
  source_system     text          NOT NULL DEFAULT 'INFINICUS',
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  created_by        uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT incidents_code_business_unique UNIQUE (business_id, incident_code)
);

-- ── business_operations.incident_escalations ──────────────────────────────────
-- Append-only escalation log.

CREATE TABLE business_operations.incident_escalations (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)                ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)             ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)            ON DELETE RESTRICT,
  incident_id      uuid          NOT NULL REFERENCES business_operations.incidents(id)  ON DELETE RESTRICT,
  escalation_level integer       NOT NULL CHECK (escalation_level > 0),
  escalated_to     uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  escalated_by     uuid          REFERENCES platform.employees(id) ON DELETE SET NULL,
  reason           text          NOT NULL,
  notes            text,
  occurred_at      timestamptz   NOT NULL DEFAULT now(),
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0032_create_bo_risk_incidents.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
