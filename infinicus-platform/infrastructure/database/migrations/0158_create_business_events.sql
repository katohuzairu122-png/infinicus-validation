-- Migration: 0158_create_business_events
-- Business Operations — append-only operational event ledger (sale, expense,
-- inventory, customer, team). Powers Digital Twin's derived KPI snapshots and
-- the Operations KPI summary panel. Deliberately lightweight (no status/
-- version/lifecycle) — this is a fact ledger, not a versioned/approvable
-- artifact, same style as business_operations.inventory_movements (0027).
-- customer_id/member_id are free-text references (not FKs to
-- customer_accounts/employees) so logging an event never requires a full CRM
-- record to exist first — matches the legacy Cloudflare D1 event log this
-- replaces, which never enforced that either.

BEGIN;

CREATE TABLE business_operations.business_events (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid          NOT NULL REFERENCES tenancy.tenants(id)     ON DELETE RESTRICT,
  workspace_id    uuid          NOT NULL REFERENCES tenancy.workspaces(id)  ON DELETE RESTRICT,
  business_id     uuid          NOT NULL REFERENCES platform.businesses(id) ON DELETE RESTRICT,
  event_type      text          NOT NULL CHECK (event_type IN (
                                   'sale','expense','inventory','customer','team'
                                 )),
  amount          numeric(18,4),
  quantity        numeric(18,4),
  category        text,
  customer_id     text,
  member_id       text,
  action          text          CHECK (action IS NULL OR action IN (
                                   'new','return','churn','hire','fire','review'
                                 )),
  notes           text,
  occurred_at     timestamptz   NOT NULL DEFAULT now(),
  correlation_id  uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at      timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO _migrations (filename) VALUES ('0158_create_business_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
