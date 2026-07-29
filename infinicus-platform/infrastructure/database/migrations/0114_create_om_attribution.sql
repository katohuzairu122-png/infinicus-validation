-- Migration: 0114_create_om_attribution
-- Stage 2I — Outcome Monitoring: attribution (Group H)

BEGIN;

CREATE TABLE outcome_monitoring.outcome_attribution_runs (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  observation_id     uuid          NOT NULL REFERENCES outcome_monitoring.outcome_observations(id) ON DELETE RESTRICT,
  status             text          NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  requested_at       timestamptz   NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_attribution_runs IS
  'A run attributing an observed outcome to contributing factors, with explicit attribution uncertainty.';
CREATE TABLE outcome_monitoring.outcome_attribution_factors (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  attribution_run_id  uuid         NOT NULL REFERENCES outcome_monitoring.outcome_attribution_runs(id) ON DELETE RESTRICT,
  factor_code         text         NOT NULL,
  description         text         NOT NULL,
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_attribution_factors IS
  'Append-only. Candidate contributing factors considered by an attribution run.';
CREATE TABLE outcome_monitoring.outcome_attribution_results (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  attribution_run_id  uuid         NOT NULL REFERENCES outcome_monitoring.outcome_attribution_runs(id) ON DELETE RESTRICT,
  factor_id           uuid         NOT NULL REFERENCES outcome_monitoring.outcome_attribution_factors(id) ON DELETE RESTRICT,
  attributed_weight   numeric(6,5) NOT NULL CHECK (attributed_weight >= 0 AND attributed_weight <= 1),
  uncertainty         numeric(6,5) NOT NULL CHECK (uncertainty >= 0 AND uncertainty <= 1),
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_monitoring.outcome_attribution_results IS
  'Append-only. Attribution weight and uncertainty assigned to each factor.';

INSERT INTO _migrations (filename) VALUES ('0114_create_om_attribution.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
