-- Migration: 0039_create_bi_metrics
-- Stage 2D — Business Intelligence: metric definitions, calculation, time-series

BEGIN;

-- ── business_intelligence.metric_definitions ────────────────────────────────────

CREATE TABLE business_intelligence.metric_definitions (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  metric_code      text          NOT NULL,
  domain           text          NOT NULL CHECK (domain IN (
                                   'financial','sales_revenue','customer','marketing',
                                   'operations_productivity','inventory_supply','workforce',
                                   'market_competitive','cross_domain'
                                 )),
  metric_type      text          NOT NULL CHECK (metric_type IN ('base','derived','ratio','rate','target')),
  name             text          NOT NULL,
  description      text,
  unit             text          NOT NULL,
  currency_code    text,
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','deprecated','retired')),
  latest_version   integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT metric_definitions_code_unique UNIQUE (business_id, metric_code)
);

-- ── business_intelligence.metric_definition_versions (append-only) ─────────────

CREATE TABLE business_intelligence.metric_definition_versions (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_definition_id     uuid          NOT NULL REFERENCES business_intelligence.metric_definitions(id) ON DELETE RESTRICT,
  tenant_id                uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id             uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id              uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number           integer       NOT NULL,
  numerator_reference      jsonb,
  denominator_reference    jsonb,
  aggregation_method       text          NOT NULL CHECK (aggregation_method IN (
                                          'sum','count','distinct_count','average','minimum','maximum','median','first','last'
                                        )),
  dimensional_filters      jsonb         NOT NULL DEFAULT '[]',
  time_grain               text          NOT NULL CHECK (time_grain IN ('day','week','month','quarter','year')),
  calculation_specification jsonb        NOT NULL DEFAULT '{}',
  correlation_id           uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at               timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT metric_definition_versions_unique UNIQUE (metric_definition_id, version_number)
);

COMMENT ON TABLE business_intelligence.metric_definition_versions IS 'Append-only calculation-specification history.';

-- ── business_intelligence.metric_calculated_values (append-only observations) ──

CREATE TABLE business_intelligence.metric_calculated_values (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_definition_id      uuid          NOT NULL REFERENCES business_intelligence.metric_definitions(id)         ON DELETE RESTRICT,
  metric_definition_version_id uuid       NOT NULL REFERENCES business_intelligence.metric_definition_versions(id) ON DELETE RESTRICT,
  tenant_id                 uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id               uuid         NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                uuid         NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  dataset_version_id         uuid         REFERENCES business_intelligence.analytical_dataset_versions(id) ON DELETE SET NULL,
  value                      numeric      NOT NULL,
  unit                       text         NOT NULL,
  currency_code              text,
  dimensions                 jsonb        NOT NULL DEFAULT '{}',
  period_start               timestamptz  NOT NULL,
  period_end                 timestamptz  NOT NULL,
  calculation_status         text         NOT NULL DEFAULT 'completed' CHECK (calculation_status IN ('completed','partial','failed')),
  confidence                 numeric(5,4) CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 1)),
  evidence_reference         jsonb        NOT NULL DEFAULT '{}',
  correlation_id             uuid         NOT NULL DEFAULT gen_random_uuid(),
  calculated_at              timestamptz  NOT NULL DEFAULT now(),
  created_at                 timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT metric_calculated_values_period_check CHECK (period_end > period_start)
);

COMMENT ON TABLE business_intelligence.metric_calculated_values IS
  'Append-only. Each calculation is a new observation — never overwritten. No silent unit or currency conversion.';

-- ── business_intelligence.metric_time_series_values (append-only) ──────────────

CREATE TABLE business_intelligence.metric_time_series_values (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_calculated_value_id uuid         NOT NULL REFERENCES business_intelligence.metric_calculated_values(id) ON DELETE RESTRICT,
  tenant_id                  uuid         NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid        NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid        NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  observed_at                 timestamptz NOT NULL,
  sequence_number              integer    NOT NULL,
  value                        numeric    NOT NULL,
  unit                         text       NOT NULL,
  currency_code                text,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT metric_time_series_sequence_unique UNIQUE (metric_calculated_value_id, sequence_number)
);

COMMENT ON TABLE business_intelligence.metric_time_series_values IS
  'Append-only. sequence_number enforces monotonic time ordering within a calculation.';

INSERT INTO _migrations (filename) VALUES ('0039_create_bi_metrics.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
