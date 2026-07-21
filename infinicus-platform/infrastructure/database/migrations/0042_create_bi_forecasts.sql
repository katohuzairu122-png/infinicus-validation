-- Migration: 0042_create_bi_forecasts
-- Stage 2D — Business Intelligence: forecasts and accuracy tracking

BEGIN;

-- ── business_intelligence.forecast_models ────────────────────────────────────────

CREATE TABLE business_intelligence.forecast_models (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  model_code       text          NOT NULL,
  model_version    text          NOT NULL,
  algorithm        text          NOT NULL,
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated','retired')),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT forecast_models_code_version_unique UNIQUE (business_id, model_code, model_version)
);

-- ── business_intelligence.forecast_requests ──────────────────────────────────────

CREATE TABLE business_intelligence.forecast_requests (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  metric_definition_id uuid       NOT NULL REFERENCES business_intelligence.metric_definitions(id) ON DELETE RESTRICT,
  forecast_model_id uuid          NOT NULL REFERENCES business_intelligence.forecast_models(id) ON DELETE RESTRICT,
  horizon_periods   integer       NOT NULL CHECK (horizon_periods > 0),
  time_grain        text          NOT NULL CHECK (time_grain IN ('day','week','month','quarter','year')),
  status            text          NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','running','completed','failed','cancelled')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

-- ── business_intelligence.forecast_runs ──────────────────────────────────────────

CREATE TABLE business_intelligence.forecast_runs (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_request_id uuid          NOT NULL REFERENCES business_intelligence.forecast_requests(id) ON DELETE RESTRICT,
  tenant_id           uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id        uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id         uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  status               text         NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  assumptions           jsonb        NOT NULL DEFAULT '[]',
  publication_status     text        NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published')),
  correlation_id           uuid      NOT NULL DEFAULT gen_random_uuid(),
  started_at                 timestamptz,
  completed_at                timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forecast_runs_completion_check CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

COMMENT ON TABLE business_intelligence.forecast_runs IS
  'Once publication_status = published, the run and its points are immutable (enforced by trigger, migration 0049).';

-- ── business_intelligence.forecast_points (append-only) ─────────────────────────

CREATE TABLE business_intelligence.forecast_points (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_run_id   uuid          NOT NULL REFERENCES business_intelligence.forecast_runs(id) ON DELETE RESTRICT,
  tenant_id         uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id      uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id       uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  sequence_number   integer       NOT NULL,
  period_start      timestamptz   NOT NULL,
  period_end        timestamptz   NOT NULL,
  predicted_value   numeric       NOT NULL,
  confidence_low    numeric       NOT NULL,
  confidence_high   numeric       NOT NULL,
  confidence_level  numeric(5,4)  NOT NULL CHECK (confidence_level BETWEEN 0 AND 1),
  unit              text          NOT NULL,
  currency_code     text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT forecast_points_sequence_unique UNIQUE (forecast_run_id, sequence_number),
  CONSTRAINT forecast_points_period_check CHECK (period_end > period_start),
  CONSTRAINT forecast_points_confidence_check CHECK (confidence_high >= confidence_low)
);

-- ── business_intelligence.forecast_accuracy_records (append-only) ───────────────

CREATE TABLE business_intelligence.forecast_accuracy_records (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_point_id    uuid          NOT NULL REFERENCES business_intelligence.forecast_points(id) ON DELETE RESTRICT,
  tenant_id            uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id         uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id          uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  actual_value          numeric      NOT NULL,
  absolute_error         numeric     NOT NULL,
  percentage_error         numeric,
  evaluation_period_start    timestamptz NOT NULL,
  evaluation_period_end       timestamptz NOT NULL,
  recorded_at                    timestamptz NOT NULL DEFAULT now(),
  created_at                       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forecast_accuracy_period_check CHECK (evaluation_period_end > evaluation_period_start)
);

INSERT INTO _migrations (filename) VALUES ('0042_create_bi_forecasts.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
