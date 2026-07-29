-- Migration: 0040_create_bi_analysis
-- Stage 2D — Business Intelligence: analysis lifecycle

BEGIN;

-- ── business_intelligence.analysis_requests ─────────────────────────────────────

CREATE TABLE business_intelligence.analysis_requests (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  request_code     text          NOT NULL,
  domain           text          NOT NULL CHECK (domain IN (
                                   'financial','sales_revenue','customer','marketing',
                                   'operations_productivity','inventory_supply','workforce',
                                   'market_competitive','cross_domain'
                                 )),
  analysis_type    text          NOT NULL,
  dataset_version_id uuid        REFERENCES business_intelligence.analytical_dataset_versions(id) ON DELETE SET NULL,
  requested_by     uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  requested_by_service uuid      REFERENCES identity.service_accounts(id) ON DELETE SET NULL,
  status           text          NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','accepted','rejected','cancelled')),
  correlation_id   uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT analysis_requests_code_unique UNIQUE (business_id, request_code)
);

-- ── business_intelligence.analysis_runs ─────────────────────────────────────────

CREATE TABLE business_intelligence.analysis_runs (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_request_id uuid          NOT NULL REFERENCES business_intelligence.analysis_requests(id) ON DELETE RESTRICT,
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  component_reference text          NOT NULL,
  status              text          NOT NULL DEFAULT 'queued' CHECK (status IN (
                                      'queued','running','completed','failed','cancelled'
                                    )),
  failure_code        text,
  failure_message      text,
  started_at            timestamptz,
  completed_at           timestamptz,
  duration_ms             integer      CHECK (duration_ms IS NULL OR duration_ms >= 0),
  cost_reference          jsonb        NOT NULL DEFAULT '{}',
  correlation_id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_runs_completion_check CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

-- ── business_intelligence.analysis_inputs (append-only) ─────────────────────────

CREATE TABLE business_intelligence.analysis_inputs (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id  uuid          NOT NULL REFERENCES business_intelligence.analysis_runs(id) ON DELETE RESTRICT,
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  input_type       text          NOT NULL,
  input_reference  jsonb         NOT NULL DEFAULT '{}',
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- ── business_intelligence.analysis_outputs (append-only) ────────────────────────

CREATE TABLE business_intelligence.analysis_outputs (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id  uuid          NOT NULL REFERENCES business_intelligence.analysis_runs(id) ON DELETE RESTRICT,
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  output_type      text          NOT NULL,
  output_reference jsonb         NOT NULL DEFAULT '{}',
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- ── business_intelligence.analysis_status_history (append-only) ─────────────────

CREATE TABLE business_intelligence.analysis_status_history (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id  uuid          NOT NULL REFERENCES business_intelligence.analysis_runs(id) ON DELETE RESTRICT,
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  from_status      text,
  to_status        text          NOT NULL CHECK (to_status IN ('queued','running','completed','failed','cancelled')),
  reason           text,
  correlation_id   uuid          NOT NULL,
  occurred_at      timestamptz   NOT NULL DEFAULT now(),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0040_create_bi_analysis.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
