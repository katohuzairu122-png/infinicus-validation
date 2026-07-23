-- Migration: 0152_create_billing_rls_policies
-- BUILD-28 — RLS for the billing schema.
--
-- billing.plans is intentionally NOT enabled for RLS: it is global
-- reference/catalog data (every tenant must be able to see the plan
-- catalog to choose a plan), matching tenancy.permissions' precedent
-- (migration 0011 — no RLS on pure reference tables).
--
-- Every billing table below is scoped by tenant_id alone (not also
-- workspace_id) — billing/subscription/usage state is tenant-level, not
-- workspace-level, in this platform's model (one subscription per tenant).
-- This is a deliberate design choice, not an oversight: BUILD-27 found a
-- real defect where several *other* domains' RLS policies AND workspace_id
-- with tenant_id in a way two operational scripts didn't account for —
-- billing avoids that whole problem class by not scoping on workspace_id
-- at the RLS layer at all.

BEGIN;

ALTER TABLE billing.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_isolation ON billing.subscriptions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE billing.subscription_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscription_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY subscription_status_history_isolation ON billing.subscription_status_history
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE billing.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.usage_records FORCE ROW LEVEL SECURITY;
CREATE POLICY usage_records_isolation ON billing.usage_records
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0152_create_billing_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
