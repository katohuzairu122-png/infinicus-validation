-- Migration: 0053_create_dt_snapshots
-- Stage 2E — Business Digital Twin: state snapshots (Group D)

BEGIN;

CREATE TABLE business_digital_twin.digital_twin_snapshots (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  instance_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_instances(id) ON DELETE RESTRICT,
  dt_intake_package_id uuid        REFERENCES business_digital_twin.dt_intake_packages(id) ON DELETE SET NULL,
  snapshot_code     text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','superseded','rejected')),
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  effective_at      timestamptz   NOT NULL,
  recorded_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT digital_twin_snapshots_code_unique UNIQUE (business_id, snapshot_code)
);

COMMENT ON TABLE business_digital_twin.digital_twin_snapshots IS
  'Point-in-time business state container. Published snapshots are immutable.';

CREATE TABLE business_digital_twin.digital_twin_snapshot_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  snapshot_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_snapshots(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  summary           text          NOT NULL,
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','published','superseded','rejected')),
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT dt_snapshot_versions_unique UNIQUE (snapshot_id, version_number)
);

COMMENT ON TABLE business_digital_twin.digital_twin_snapshot_versions IS
  'Append-only. Published snapshot versions are immutable — see enforce_snapshot_immutability.';

CREATE TABLE business_digital_twin.digital_twin_snapshot_values (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  snapshot_version_id uuid        NOT NULL REFERENCES business_digital_twin.digital_twin_snapshot_versions(id) ON DELETE RESTRICT,
  state_variable_definition_id uuid REFERENCES business_digital_twin.state_variable_definitions(id) ON DELETE SET NULL,
  variable_code     text          NOT NULL,
  value_json        jsonb         NOT NULL,
  confidence        numeric(5,4)  CHECK (confidence IS NULL OR (confidence BETWEEN 0 AND 1)),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.digital_twin_snapshot_values IS
  'Append-only. Variable values captured as of a specific snapshot version.';

CREATE TABLE business_digital_twin.digital_twin_snapshot_evidence (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  snapshot_version_id uuid        NOT NULL REFERENCES business_digital_twin.digital_twin_snapshot_versions(id) ON DELETE RESTRICT,
  evidence_type     text          NOT NULL,
  evidence_reference jsonb        NOT NULL DEFAULT '{}',
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.digital_twin_snapshot_evidence IS
  'Append-only. Metrics, findings, and source evidence backing a snapshot version.';

CREATE TABLE business_digital_twin.digital_twin_snapshot_status_history (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  snapshot_id       uuid          NOT NULL REFERENCES business_digital_twin.digital_twin_snapshots(id) ON DELETE RESTRICT,
  from_status       text,
  to_status         text          NOT NULL CHECK (to_status IN ('draft','validated','published','superseded','rejected')),
  reason            text,
  actor_id          uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  correlation_id    uuid          NOT NULL,
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE business_digital_twin.digital_twin_snapshot_status_history IS
  'Append-only audit trail of snapshot lifecycle transitions.';

INSERT INTO _migrations (filename) VALUES ('0053_create_dt_snapshots.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
