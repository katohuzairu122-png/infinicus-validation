-- Migration: 0081_create_adi_decision_evidence
-- Stage 2G — AI Decision Intelligence: evidence (Group E)

BEGIN;

CREATE TABLE ai_decision_intelligence.decision_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  case_id           uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_cases(id) ON DELETE RESTRICT,
  evidence_code     text          NOT NULL,
  evidence_type     text          NOT NULL CHECK (evidence_type IN (
                                     'simulation_result','digital_twin_snapshot','business_intelligence_finding','external','other'
                                   )),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_evidence_code_unique UNIQUE (case_id, evidence_code)
);

COMMENT ON TABLE ai_decision_intelligence.decision_evidence IS
  'Governed evidence reference gathered for a decision case. Never fabricates upstream evidence — only records a reference and summary.';

CREATE TABLE ai_decision_intelligence.decision_evidence_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evidence_id       uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_evidence(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  source_reference  jsonb         NOT NULL DEFAULT '{}',
  summary           text          NOT NULL,
  confidence        numeric(5,4)  CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 1)),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT decision_evidence_versions_unique UNIQUE (evidence_id, version_number)
);

COMMENT ON TABLE ai_decision_intelligence.decision_evidence_versions IS
  'Append-only. Historical evidence reference versions.';

CREATE TABLE ai_decision_intelligence.decision_evidence_links (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evidence_version_id   uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_evidence_versions(id) ON DELETE RESTRICT,
  linked_entity_type    text          NOT NULL CHECK (linked_entity_type IN ('alternative','recommendation','reasoning_step')),
  linked_entity_id      uuid          NOT NULL,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_evidence_links IS
  'Append-only. Links evidence to the alternative, recommendation, or reasoning step it supports.';

CREATE TABLE ai_decision_intelligence.decision_evidence_quality (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evidence_version_id   uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_evidence_versions(id) ON DELETE RESTRICT,
  quality_score         numeric(5,4)  CHECK (quality_score IS NULL OR (quality_score BETWEEN 0 AND 1)),
  freshness_seconds     integer       CHECK (freshness_seconds IS NULL OR freshness_seconds >= 0),
  reliability_score     numeric(5,4)  CHECK (reliability_score IS NULL OR (reliability_score BETWEEN 0 AND 1)),
  notes                 text,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.decision_evidence_quality IS
  'Append-only. Quality/freshness/reliability evidence for a decision evidence version.';

INSERT INTO _migrations (filename) VALUES ('0081_create_adi_decision_evidence.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
