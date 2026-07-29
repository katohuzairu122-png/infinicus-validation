-- Migration: 0041_create_bi_findings_trends
-- Stage 2D — Business Intelligence: findings, evidence, trends

BEGIN;

-- ── business_intelligence.findings ──────────────────────────────────────────────

CREATE TABLE business_intelligence.findings (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  analysis_run_id    uuid          REFERENCES business_intelligence.analysis_runs(id) ON DELETE SET NULL,
  finding_code       text          NOT NULL,
  domain             text          NOT NULL CHECK (domain IN (
                                     'financial','sales_revenue','customer','marketing',
                                     'operations_productivity','inventory_supply','workforce',
                                     'market_competitive','cross_domain'
                                   )),
  latest_version     integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  superseded_by      uuid          REFERENCES business_intelligence.findings(id) ON DELETE SET NULL,
  publication_status text          NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','superseded','retracted')),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT findings_code_unique UNIQUE (business_id, finding_code)
);

-- ── business_intelligence.finding_versions (append-only, immutable once published) ─

CREATE TABLE business_intelligence.finding_versions (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id         uuid          NOT NULL REFERENCES business_intelligence.findings(id) ON DELETE RESTRICT,
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  title              text          NOT NULL,
  statement          text          NOT NULL,
  confidence         numeric(5,4)  NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  materiality        text          NOT NULL CHECK (materiality IN ('low','medium','high','critical')),
  limitations         jsonb        NOT NULL DEFAULT '[]',
  correlation_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finding_versions_unique UNIQUE (finding_id, version_number)
);

COMMENT ON TABLE business_intelligence.finding_versions IS
  'Append-only. Published findings are immutable — corrections publish a new version and set findings.superseded_by.';

-- ── business_intelligence.finding_evidence (append-only) ────────────────────────

CREATE TABLE business_intelligence.finding_evidence (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_version_id uuid          NOT NULL REFERENCES business_intelligence.finding_versions(id) ON DELETE RESTRICT,
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  evidence_type      text          NOT NULL,
  evidence_reference jsonb         NOT NULL DEFAULT '{}',
  created_at         timestamptz   NOT NULL DEFAULT now()
);

-- ── business_intelligence.trends ─────────────────────────────────────────────────

CREATE TABLE business_intelligence.trends (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  metric_definition_id uuid      REFERENCES business_intelligence.metric_definitions(id) ON DELETE SET NULL,
  trend_code       text          NOT NULL,
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  latest_version   integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT trends_code_unique UNIQUE (business_id, trend_code)
);

-- ── business_intelligence.trend_observations (append-only) ──────────────────────

CREATE TABLE business_intelligence.trend_observations (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id         uuid          NOT NULL REFERENCES business_intelligence.trends(id) ON DELETE RESTRICT,
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number   integer       NOT NULL,
  direction        text          NOT NULL CHECK (direction IN ('increasing','decreasing','stable','volatile')),
  magnitude        numeric       NOT NULL,
  period_start     timestamptz   NOT NULL,
  period_end       timestamptz   NOT NULL,
  confidence       numeric(5,4)  NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence_reference jsonb       NOT NULL DEFAULT '{}',
  correlation_id     uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trend_observations_unique UNIQUE (trend_id, version_number),
  CONSTRAINT trend_observations_period_check CHECK (period_end > period_start)
);

INSERT INTO _migrations (filename) VALUES ('0041_create_bi_findings_trends.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
