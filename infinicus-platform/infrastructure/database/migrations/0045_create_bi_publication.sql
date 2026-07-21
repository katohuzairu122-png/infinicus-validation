-- Migration: 0045_create_bi_publication
-- Stage 2D — Business Intelligence: insight and publication packages
-- Target layers limited to the authorized downstream consumers: Business
-- Digital Twin, Simulation, AI Decision Intelligence. No consumer logic here.

BEGIN;

-- ── business_intelligence.insight_packages ───────────────────────────────────────

CREATE TABLE business_intelligence.insight_packages (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id     uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id      uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  package_code     text          NOT NULL,
  latest_version   integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  status           text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','revoked')),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT insight_packages_code_unique UNIQUE (business_id, package_code)
);

-- ── business_intelligence.insight_package_versions (append-only) ────────────────

CREATE TABLE business_intelligence.insight_package_versions (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_package_id  uuid          NOT NULL REFERENCES business_intelligence.insight_packages(id) ON DELETE RESTRICT,
  tenant_id            uuid         NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id          uuid        NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id            uuid       NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  version_number           integer  NOT NULL,
  finding_ids                 jsonb NOT NULL DEFAULT '[]',
  metric_value_ids               jsonb NOT NULL DEFAULT '[]',
  forecast_run_ids                  jsonb NOT NULL DEFAULT '[]',
  anomaly_detection_ids                jsonb NOT NULL DEFAULT '[]',
  risk_assessment_ids                     jsonb NOT NULL DEFAULT '[]',
  summary                                    text NOT NULL,
  correlation_id                                uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at                                       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insight_package_versions_unique UNIQUE (insight_package_id, version_number)
);

COMMENT ON TABLE business_intelligence.insight_package_versions IS 'Append-only. References analytical evidence by id — never duplicates it.';

-- ── business_intelligence.bi_publication_packages ────────────────────────────────

CREATE TABLE business_intelligence.bi_publication_packages (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id              uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id               uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  insight_package_version_id uuid         NOT NULL REFERENCES business_intelligence.insight_package_versions(id) ON DELETE RESTRICT,
  target_layer              text          NOT NULL CHECK (target_layer IN (
                                            'business_digital_twin','simulation','ai_decision_intelligence'
                                          )),
  target_block               text         NOT NULL,
  publication_status          text        NOT NULL DEFAULT 'draft' CHECK (publication_status IN (
                                            'draft','ready','dispatched','acknowledged','rejected','revoked'
                                          )),
  idempotency_key                text     NOT NULL,
  dispatched_at                     timestamptz,
  acknowledged_at                      timestamptz,
  rejected_at                             timestamptz,
  rejection_reason                          text,
  revoked_at                                   timestamptz,
  correlation_id                                  uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at                                         timestamptz NOT NULL DEFAULT now(),
  updated_at                                            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bi_publication_packages_idempotency_unique UNIQUE (business_id, idempotency_key)
);

COMMENT ON TABLE business_intelligence.bi_publication_packages IS
  'Declares publication to an authorized downstream layer. Persists declaration and lifecycle only — does not implement the downstream consumer.';

-- ── business_intelligence.bi_publication_events (append-only) ───────────────────

CREATE TABLE business_intelligence.bi_publication_events (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  bi_publication_package_id uuid         NOT NULL REFERENCES business_intelligence.bi_publication_packages(id) ON DELETE RESTRICT,
  tenant_id                 uuid         NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid       NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                   uuid     NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  event_type                       text  NOT NULL CHECK (event_type IN (
                                            'dispatch','acknowledgement','rejection','revocation','replay'
                                          )),
  notes                               text,
  occurred_at                            timestamptz NOT NULL DEFAULT now(),
  correlation_id                            uuid NOT NULL,
  created_at                                   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0045_create_bi_publication.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
