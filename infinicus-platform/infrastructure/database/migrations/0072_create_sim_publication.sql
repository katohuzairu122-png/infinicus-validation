-- Migration: 0072_create_sim_publication
-- Stage 2F — Simulation: publication (Group J)

BEGIN;

CREATE TABLE simulation.simulation_insight_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  package_code      text          NOT NULL,
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','revoked')),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_insight_packages_code_unique UNIQUE (business_id, package_code)
);

COMMENT ON TABLE simulation.simulation_insight_packages IS
  'Packaged Simulation results prepared for downstream publication.';

CREATE TABLE simulation.simulation_insight_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  simulation_insight_package_id uuid NOT NULL REFERENCES simulation.simulation_insight_packages(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  result_version_id uuid          REFERENCES simulation.simulation_result_versions(id) ON DELETE SET NULL,
  summary           text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_insight_package_versions_unique UNIQUE (simulation_insight_package_id, version_number)
);

COMMENT ON TABLE simulation.simulation_insight_package_versions IS
  'Append-only. Historical insight-package versions.';

CREATE TABLE simulation.simulation_publication_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  simulation_insight_package_version_id uuid NOT NULL REFERENCES simulation.simulation_insight_package_versions(id) ON DELETE RESTRICT,
  target_layer      text          NOT NULL CHECK (target_layer IN ('ai_decision_intelligence')),
  target_block      text          NOT NULL,
  publication_status text         NOT NULL DEFAULT 'draft' CHECK (publication_status IN (
                                     'draft','ready','dispatched','acknowledged','rejected','revoked'
                                   )),
  idempotency_key   text          NOT NULL,
  dispatched_at     timestamptz,
  acknowledged_at   timestamptz,
  rejected_at       timestamptz,
  rejection_reason  text,
  revoked_at        timestamptz,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT simulation_publication_packages_idempotency_unique UNIQUE (business_id, idempotency_key)
);

COMMENT ON TABLE simulation.simulation_publication_packages IS
  'Declares publication to AI Decision Intelligence (the only authorized downstream layer for SIM). Persists declaration and lifecycle only.';

CREATE TABLE simulation.simulation_publication_events (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  simulation_publication_package_id uuid NOT NULL REFERENCES simulation.simulation_publication_packages(id) ON DELETE RESTRICT,
  event_type        text          NOT NULL CHECK (event_type IN ('dispatch','acknowledgement','rejection','revocation','replay')),
  detail            jsonb         NOT NULL DEFAULT '{}',
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE simulation.simulation_publication_events IS
  'Append-only. Publication lifecycle event log.';

INSERT INTO _migrations (filename) VALUES ('0072_create_sim_publication.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
