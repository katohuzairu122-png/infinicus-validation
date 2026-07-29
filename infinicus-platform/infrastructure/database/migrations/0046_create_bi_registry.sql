-- Migration: 0046_create_bi_registry
-- Stage 2D — Business Intelligence: component registry and deployment state

BEGIN;

-- ── business_intelligence.bi_component_registry ──────────────────────────────────

CREATE TABLE business_intelligence.bi_component_registry (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  component_code   text          NOT NULL,
  component_type   text          NOT NULL CHECK (component_type IN (
                                   'metric_engine','analysis_engine','forecast_engine',
                                   'anomaly_engine','benchmark_engine','risk_engine','publication_engine'
                                 )),
  status           text          NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','retired')),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT bi_component_registry_code_unique UNIQUE (business_id, component_code)
);

-- ── business_intelligence.bi_component_versions (append-only) ───────────────────

CREATE TABLE business_intelligence.bi_component_versions (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id          uuid          NOT NULL REFERENCES business_intelligence.bi_component_registry(id) ON DELETE RESTRICT,
  tenant_id             uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id          uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id           uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number        text          NOT NULL,
  compatibility_reference jsonb       NOT NULL DEFAULT '{}',
  created_at             timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT bi_component_versions_unique UNIQUE (component_id, version_number)
);

-- ── business_intelligence.bi_deployments ─────────────────────────────────────────

CREATE TABLE business_intelligence.bi_deployments (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  component_version_id  uuid          NOT NULL REFERENCES business_intelligence.bi_component_versions(id) ON DELETE RESTRICT,
  tenant_id              uuid         NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id            uuid        NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id              uuid       NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  activation_state           text     NOT NULL DEFAULT 'pending' CHECK (activation_state IN (
                                        'pending','active','rolled_back','superseded'
                                      )),
  activated_at                  timestamptz,
  correlation_id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at                          timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);

-- ── business_intelligence.bi_deployment_rollbacks (append-only) ─────────────────

CREATE TABLE business_intelligence.bi_deployment_rollbacks (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id    uuid          NOT NULL REFERENCES business_intelligence.bi_deployments(id) ON DELETE RESTRICT,
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  reason           text          NOT NULL,
  rolled_back_to_deployment_id uuid REFERENCES business_intelligence.bi_deployments(id) ON DELETE SET NULL,
  occurred_at        timestamptz  NOT NULL DEFAULT now(),
  correlation_id        uuid      NOT NULL DEFAULT gen_random_uuid(),
  created_at               timestamptz NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0046_create_bi_registry.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
