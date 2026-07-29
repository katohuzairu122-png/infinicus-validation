-- Migration: 0087_create_adi_publication
-- Stage 2G — AI Decision Intelligence: publication (Group K)

BEGIN;

CREATE TABLE ai_decision_intelligence.adi_insight_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  package_code      text          NOT NULL,
  latest_version    integer       NOT NULL DEFAULT 0 CHECK (latest_version >= 0),
  status            text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','revoked')),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT adi_insight_packages_code_unique UNIQUE (business_id, package_code)
);

COMMENT ON TABLE ai_decision_intelligence.adi_insight_packages IS
  'Packaged ADI recommendations prepared for downstream publication.';

CREATE TABLE ai_decision_intelligence.adi_insight_package_versions (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  adi_insight_package_id  uuid      NOT NULL REFERENCES ai_decision_intelligence.adi_insight_packages(id) ON DELETE RESTRICT,
  version_number    integer       NOT NULL,
  recommendation_version_id uuid   REFERENCES ai_decision_intelligence.decision_recommendation_versions(id) ON DELETE SET NULL,
  summary           text          NOT NULL,
  correlation_id    uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT adi_insight_package_versions_unique UNIQUE (adi_insight_package_id, version_number)
);

COMMENT ON TABLE ai_decision_intelligence.adi_insight_package_versions IS
  'Append-only. Historical insight-package versions.';

CREATE TABLE ai_decision_intelligence.adi_publication_packages (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  adi_insight_package_version_id uuid NOT NULL REFERENCES ai_decision_intelligence.adi_insight_package_versions(id) ON DELETE RESTRICT,
  target_layer      text          NOT NULL CHECK (target_layer IN ('approved_business_action')),
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
  CONSTRAINT adi_publication_packages_idempotency_unique UNIQUE (business_id, idempotency_key)
);

COMMENT ON TABLE ai_decision_intelligence.adi_publication_packages IS
  'Declares publication to Approved Business Action (the only authorized downstream layer for ADI). Persists the recommendation declaration and its lifecycle only — never an approval or execution outcome.';

CREATE TABLE ai_decision_intelligence.adi_publication_events (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  adi_publication_package_id uuid  NOT NULL REFERENCES ai_decision_intelligence.adi_publication_packages(id) ON DELETE RESTRICT,
  event_type        text          NOT NULL CHECK (event_type IN ('dispatch','acknowledgement','rejection','revocation','replay')),
  detail            jsonb         NOT NULL DEFAULT '{}',
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_decision_intelligence.adi_publication_events IS
  'Append-only. Publication lifecycle event log.';

INSERT INTO _migrations (filename) VALUES ('0087_create_adi_publication.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
