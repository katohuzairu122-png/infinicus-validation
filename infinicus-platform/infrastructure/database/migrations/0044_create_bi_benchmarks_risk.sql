-- Migration: 0044_create_bi_benchmarks_risk
-- Stage 2D — Business Intelligence: benchmarks, comparisons, risk intelligence

BEGIN;

-- ── business_intelligence.benchmark_definitions ─────────────────────────────────

CREATE TABLE business_intelligence.benchmark_definitions (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  benchmark_code   text          NOT NULL,
  metric_definition_id uuid      REFERENCES business_intelligence.metric_definitions(id) ON DELETE SET NULL,
  peer_cohort_reference jsonb    NOT NULL DEFAULT '{}',
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT benchmark_definitions_code_unique UNIQUE (business_id, benchmark_code)
);

-- ── business_intelligence.benchmark_datasets (append-only) ──────────────────────

CREATE TABLE business_intelligence.benchmark_datasets (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_definition_id uuid       NOT NULL REFERENCES business_intelligence.benchmark_definitions(id) ON DELETE RESTRICT,
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  period_start         timestamptz   NOT NULL,
  period_end           timestamptz   NOT NULL,
  data_reference        jsonb        NOT NULL DEFAULT '{}',
  limitations             jsonb      NOT NULL DEFAULT '[]',
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT benchmark_datasets_period_check CHECK (period_end > period_start)
);

-- ── business_intelligence.comparison_runs ────────────────────────────────────────

CREATE TABLE business_intelligence.comparison_runs (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_definition_id uuid         NOT NULL REFERENCES business_intelligence.benchmark_definitions(id) ON DELETE RESTRICT,
  benchmark_dataset_id    uuid         NOT NULL REFERENCES business_intelligence.benchmark_datasets(id)    ON DELETE RESTRICT,
  tenant_id                uuid        NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id              uuid       NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                uuid      NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  status                      text     NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed')),
  correlation_id                uuid   NOT NULL DEFAULT gen_random_uuid(),
  created_at                      timestamptz NOT NULL DEFAULT now()
);

-- ── business_intelligence.comparison_results (append-only) ──────────────────────

CREATE TABLE business_intelligence.comparison_results (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_run_id  uuid          NOT NULL REFERENCES business_intelligence.comparison_runs(id) ON DELETE RESTRICT,
  tenant_id          uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id       uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id        uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  business_value      numeric      NOT NULL,
  peer_value            numeric    NOT NULL,
  percentile_rank         numeric(5,4) CHECK (percentile_rank IS NULL OR (percentile_rank BETWEEN 0 AND 1)),
  confidence                numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  limitations                  jsonb   NOT NULL DEFAULT '[]',
  created_at                     timestamptz NOT NULL DEFAULT now()
);

-- ── business_intelligence.risk_models ────────────────────────────────────────────

CREATE TABLE business_intelligence.risk_models (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_code       text          NOT NULL,
  model_version    text          NOT NULL,
  domain           text          NOT NULL CHECK (domain IN (
                                   'financial','sales_revenue','customer','marketing',
                                   'operations_productivity','inventory_supply','workforce',
                                   'market_competitive','cross_domain'
                                 )),
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated','retired')),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT risk_models_code_version_unique UNIQUE (business_id, model_code, model_version)
);

-- ── business_intelligence.risk_assessments (append-only) ────────────────────────

CREATE TABLE business_intelligence.risk_assessments (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_model_id    uuid          NOT NULL REFERENCES business_intelligence.risk_models(id) ON DELETE RESTRICT,
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  risk_score        numeric(5,4) NOT NULL CHECK (risk_score BETWEEN 0 AND 1),
  likelihood          numeric(5,4) NOT NULL CHECK (likelihood BETWEEN 0 AND 1),
  severity              text      NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  publication_status      text    NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','superseded')),
  limitations                jsonb NOT NULL DEFAULT '[]',
  correlation_id                uuid NOT NULL DEFAULT gen_random_uuid(),
  assessed_at                      timestamptz NOT NULL DEFAULT now(),
  created_at                         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_intelligence.risk_assessments IS 'Append-only. Corrections publish a new assessment, never mutate history.';

-- ── business_intelligence.risk_factors (append-only) ─────────────────────────────

CREATE TABLE business_intelligence.risk_factors (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_assessment_id  uuid          NOT NULL REFERENCES business_intelligence.risk_assessments(id) ON DELETE RESTRICT,
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  factor_code         text          NOT NULL,
  weight               numeric(5,4) NOT NULL CHECK (weight BETWEEN 0 AND 1),
  evidence_reference     jsonb      NOT NULL DEFAULT '{}',
  created_at                timestamptz NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0044_create_bi_benchmarks_risk.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
