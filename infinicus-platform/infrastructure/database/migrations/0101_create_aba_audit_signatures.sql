-- Migration: 0101_create_aba_audit_signatures
-- Stage 2H — Approved Business Action: audit and signatures (Group J)

BEGIN;

CREATE TABLE approved_business_action.approval_attestations (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  decision_version_id  uuid   NOT NULL REFERENCES approved_business_action.approval_decision_versions(id) ON DELETE RESTRICT,
  attestation_code  text          NOT NULL,
  statement         text          NOT NULL,
  attested_by       uuid          REFERENCES identity.users(id) ON DELETE SET NULL,
  attested_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_attestations IS
  'Append-only. A recorded attestation supporting a decision version.';
CREATE TABLE approved_business_action.approval_signatures (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  attestation_id      uuid       NOT NULL REFERENCES approved_business_action.approval_attestations(id) ON DELETE RESTRICT,
  signature_reference text          NOT NULL,
  signed_at           timestamptz   NOT NULL DEFAULT now(),
  created_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_signatures IS
  'Append-only. A reference to a signature artifact — never raw signature bytes.';
CREATE TABLE approved_business_action.approval_audit_events (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid          NOT NULL REFERENCES tenancy.tenants(id)      ON DELETE RESTRICT,
  workspace_id                uuid          NOT NULL REFERENCES tenancy.workspaces(id)   ON DELETE RESTRICT,
  business_id                 uuid          NOT NULL REFERENCES platform.businesses(id)  ON DELETE RESTRICT,
  decision_id       uuid          REFERENCES approved_business_action.approval_decisions(id) ON DELETE SET NULL,
  event_type        text          NOT NULL,
  detail            jsonb         NOT NULL DEFAULT '{}',
  occurred_at       timestamptz   NOT NULL DEFAULT now(),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE approved_business_action.approval_audit_events IS
  'Append-only. General audit log for approval activity.';

INSERT INTO _migrations (filename) VALUES ('0101_create_aba_audit_signatures.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
