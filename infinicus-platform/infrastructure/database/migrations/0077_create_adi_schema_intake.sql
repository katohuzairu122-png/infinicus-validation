-- Migration: 0077_create_adi_schema_intake
-- Stage 2G — AI Decision Intelligence: schema + intake and lineage (Group A)

BEGIN;

CREATE SCHEMA IF NOT EXISTS ai_decision_intelligence;

CREATE TABLE ai_decision_intelligence.adi_intake_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  simulation_publication_package_id  uuid          NOT NULL REFERENCES simulation.simulation_publication_packages(id) ON DELETE RESTRICT,
  intake_code                text          NOT NULL,
  status                     text          NOT NULL DEFAULT 'received' CHECK (status IN (
                                            'received','validated','accepted','processing','completed','rejected','failed'
                                          )),
  rejection_reason           text,
  schema_version              text         NOT NULL DEFAULT '1.0',
  idempotency_key             text         NOT NULL,
  correlation_id              uuid         NOT NULL DEFAULT gen_random_uuid(),
  causation_id                 uuid,
  created_at                  timestamptz  NOT NULL DEFAULT now(),
  updated_at                  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT adi_intake_packages_idempotency_unique UNIQUE (business_id, idempotency_key),
  CONSTRAINT adi_intake_packages_sim_package_unique UNIQUE (business_id, simulation_publication_package_id)
);

COMMENT ON TABLE ai_decision_intelligence.adi_intake_packages IS
  'Validated intake of Simulation publication packages into AI Decision Intelligence. Idempotent per (business_id, idempotency_key) and per (business_id, simulation_publication_package_id).';

CREATE TABLE ai_decision_intelligence.adi_intake_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id  uuid          NOT NULL REFERENCES ai_decision_intelligence.adi_intake_packages(id) ON DELETE RESTRICT,
  version_number     integer       NOT NULL,
  payload_reference  jsonb         NOT NULL DEFAULT '{}',
  record_count       integer       NOT NULL DEFAULT 0,
  quality_score      numeric(5,4)  CHECK (quality_score      IS NULL OR (quality_score      BETWEEN 0 AND 1)),
  completeness_score numeric(5,4)  CHECK (completeness_score IS NULL OR (completeness_score BETWEEN 0 AND 1)),
  correlation_id     uuid          NOT NULL,
  recorded_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT adi_intake_versions_unique UNIQUE (intake_package_id, version_number),
  CONSTRAINT adi_intake_versions_record_count_check CHECK (record_count >= 0)
);

COMMENT ON TABLE ai_decision_intelligence.adi_intake_package_versions IS
  'Append-only. Historical intake versions must never be updated in place.';

CREATE TABLE ai_decision_intelligence.adi_intake_source_references (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id     uuid          NOT NULL REFERENCES ai_decision_intelligence.adi_intake_packages(id) ON DELETE RESTRICT,
  source_system         text          NOT NULL,
  source_reference      jsonb         NOT NULL DEFAULT '{}',
  recorded_at           timestamptz   NOT NULL DEFAULT now(),
  created_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.adi_intake_source_references IS
  'Append-only. Preserves upstream lineage to Simulation publication packages.';

CREATE TABLE ai_decision_intelligence.adi_intake_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  intake_package_id  uuid          NOT NULL REFERENCES ai_decision_intelligence.adi_intake_packages(id) ON DELETE RESTRICT,
  from_status        text,
  to_status          text          NOT NULL CHECK (to_status IN (
                                      'received','validated','accepted','processing','completed','rejected','failed'
                                    )),
  reason             text,
  actor_id           uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id     uuid          NOT NULL,
  occurred_at        timestamptz   NOT NULL DEFAULT now(),
  created_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.adi_intake_status_history IS
  'Append-only audit trail of intake lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0077_create_adi_schema_intake.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
