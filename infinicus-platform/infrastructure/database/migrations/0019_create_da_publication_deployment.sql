-- Migration: 0019_create_da_publication_deployment
-- Stage 2B — Publication and deployment tables
-- Tables: publication_packages, publication_deliveries,
--         layer_assemblies, layer_deployments, layer_rollbacks

BEGIN;

-- ── data_acquisition.publication_packages ────────────────────────────────────

CREATE TABLE data_acquisition.publication_packages (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id             uuid          NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  business_id              uuid          REFERENCES platform.businesses(id)         ON DELETE SET NULL,
  package_type             text          NOT NULL,
  package_version          text          NOT NULL DEFAULT '1.0',
  target_layer             text          NOT NULL,
  target_block             text          NOT NULL,
  data_reference           jsonb         NOT NULL DEFAULT '{}',
  record_count             integer       NOT NULL DEFAULT 0,
  quality_score            numeric(5,4),
  reliability_score        numeric(5,4),
  schema_reference_id      uuid          REFERENCES data_acquisition.detected_schemas(id) ON DELETE SET NULL,
  provenance_reference_ids jsonb         NOT NULL DEFAULT '[]',
  limitations              jsonb         NOT NULL DEFAULT '[]',
  status                   text          NOT NULL DEFAULT 'draft',
  published_at             timestamptz,
  correlation_id           uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  created_by               uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT publication_packages_target_layer_check CHECK (target_layer IN (
    'business_operations','business_intelligence','business_digital_twin',
    'simulation','ai_decision_intelligence','approved_business_action',
    'outcome_monitoring','continuous_learning'
  )),
  CONSTRAINT publication_packages_status_check CHECK (status IN (
    'draft','ready','published','blocked','failed','revoked'
  )),
  CONSTRAINT publication_packages_record_count_nonneg CHECK (record_count >= 0),
  CONSTRAINT publication_packages_quality_check CHECK (
    quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)
  ),
  CONSTRAINT publication_packages_reliability_check CHECK (
    reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 1)
  )
);

-- ── data_acquisition.publication_deliveries ───────────────────────────────────

CREATE TABLE data_acquisition.publication_deliveries (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_package_id  uuid        NOT NULL REFERENCES data_acquisition.publication_packages(id) ON DELETE RESTRICT,
  destination_type        text        NOT NULL,
  destination_reference   text        NOT NULL,
  delivery_status         text        NOT NULL DEFAULT 'pending',
  attempt_count           integer     NOT NULL DEFAULT 0,
  last_attempt_at         timestamptz,
  delivered_at            timestamptz,
  failure_reason          text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT publication_deliveries_status_check CHECK (delivery_status IN (
    'pending','in_progress','delivered','failed','cancelled'
  )),
  CONSTRAINT publication_deliveries_attempt_nonneg CHECK (attempt_count >= 0)
);

-- ── data_acquisition.layer_assemblies ────────────────────────────────────────

CREATE TABLE data_acquisition.layer_assemblies (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version   text        NOT NULL,
  environment       text        NOT NULL,
  block_manifest    jsonb       NOT NULL DEFAULT '{}',
  validation_result jsonb       NOT NULL DEFAULT '{}',
  state             text        NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT layer_assemblies_state_check CHECK (state IN (
    'pending','validating','valid','invalid','deploying','deployed','failed','archived'
  )),
  CONSTRAINT layer_assemblies_environment_check CHECK (environment IN (
    'development','staging','production','test'
  ))
);

-- ── data_acquisition.layer_deployments ───────────────────────────────────────

CREATE TABLE data_acquisition.layer_deployments (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_assembly_id     uuid        NOT NULL REFERENCES data_acquisition.layer_assemblies(id) ON DELETE RESTRICT,
  release_version       text        NOT NULL,
  environment           text        NOT NULL,
  adapter_type          text        NOT NULL,
  deployment_reference  text,
  state                 text        NOT NULL DEFAULT 'pending',
  deployed_at           timestamptz NOT NULL DEFAULT now(),
  deployed_by           uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  rollback_reference_id uuid        REFERENCES data_acquisition.layer_deployments(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT layer_deployments_state_check CHECK (state IN (
    'pending','deploying','active','rolled_back','failed','archived'
  )),
  CONSTRAINT layer_deployments_environment_check CHECK (environment IN (
    'development','staging','production','test'
  ))
);

-- ── data_acquisition.layer_rollbacks ─────────────────────────────────────────

CREATE TABLE data_acquisition.layer_rollbacks (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_deployment_id   uuid        NOT NULL REFERENCES data_acquisition.layer_deployments(id) ON DELETE RESTRICT,
  reason                text        NOT NULL,
  rollback_version      text        NOT NULL,
  state                 text        NOT NULL DEFAULT 'pending',
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  CONSTRAINT layer_rollbacks_state_check CHECK (state IN (
    'pending','rolling_back','completed','failed'
  ))
);

INSERT INTO _migrations (filename) VALUES ('0019_create_da_publication_deployment.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
