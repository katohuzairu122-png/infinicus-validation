-- Migration: 0086_create_adi_monitoring_requirements
-- Stage 2G — AI Decision Intelligence: monitoring requirements (Group J)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_monitoring_requirements (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  recommendation_version_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE RESTRICT,
  requirement_code   text          NOT NULL,
  description        text          NOT NULL,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','retired')),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_monitoring_requirements_unique UNIQUE (recommendation_version_id, requirement_code)
);

COMMENT ON TABLE ai_decision_intelligence.decision_monitoring_requirements IS
  'A monitoring requirement ADI attaches to a recommendation. ADI declares what should be watched — it never records outcomes itself; that is the authority of Outcome Monitoring.';

CREATE TABLE ai_decision_intelligence.decision_monitoring_metrics (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitoring_requirement_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_monitoring_requirements(id) ON DELETE RESTRICT,
  metric_code        text          NOT NULL,
  target_value       jsonb         NOT NULL,
  unit               text,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_monitoring_metrics IS
  'Append-only. Named target metrics for a monitoring requirement.';

CREATE TABLE ai_decision_intelligence.decision_review_schedules (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  monitoring_requirement_id  uuid   NOT NULL REFERENCES ai_decision_intelligence.decision_monitoring_requirements(id) ON DELETE RESTRICT,
  scheduled_at        timestamptz  NOT NULL,
  status              text         NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','skipped')),
  completed_at        timestamptz,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_review_schedules IS
  'A scheduled review checkpoint for a monitoring requirement.';

INSERT INTO _migrations (filename) VALUES ('0086_create_adi_monitoring_requirements.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
