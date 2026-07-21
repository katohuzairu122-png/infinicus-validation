-- Migration: 0011_create_rls_policies
-- Stage 2A — Row-Level Security on all tenant-owned tables
-- Transaction context required before any query:
--   SET LOCAL app.tenant_id    = '<uuid>';
--   SET LOCAL app.workspace_id = '<uuid>';
--   SET LOCAL app.user_id      = '<uuid>';

BEGIN;

-- ── Enable RLS ───────────────────────────────────────────────────────────────

-- tenancy
ALTER TABLE tenancy.tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.workspaces    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy.invitations   ENABLE ROW LEVEL SECURITY;

-- identity (tenant-scoped tables only; identity.users is global)
ALTER TABLE identity.service_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.api_key_references ENABLE ROW LEVEL SECURITY;

-- platform
ALTER TABLE platform.businesses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.organization_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.inventory_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.warehouses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.metrics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.simulations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.decisions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.approved_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outcomes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.learning_items     ENABLE ROW LEVEL SECURITY;

-- audit
ALTER TABLE audit.audit_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.entity_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.access_events   ENABLE ROW LEVEL SECURITY;

-- events
ALTER TABLE events.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events.inbox_events  ENABLE ROW LEVEL SECURITY;

-- files
ALTER TABLE files.file_objects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE files.file_access_events ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────────────────
-- All policies are RESTRICTIVE: missing tenant context returns zero rows.

-- tenancy.tenants — each session sees only its own tenant
CREATE POLICY tenants_isolation ON tenancy.tenants
  USING (id = current_setting('app.tenant_id', true)::uuid);

-- tenancy.workspaces — scoped to tenant
CREATE POLICY workspaces_isolation ON tenancy.workspaces
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- tenancy.memberships — scoped to tenant + workspace
CREATE POLICY memberships_isolation ON tenancy.memberships
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- tenancy.roles — system roles (tenant_id IS NULL) are visible platform-wide
CREATE POLICY roles_isolation ON tenancy.roles
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- tenancy.invitations — scoped to tenant
CREATE POLICY invitations_isolation ON tenancy.invitations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- identity.service_accounts — scoped to tenant
CREATE POLICY service_accounts_isolation ON identity.service_accounts
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- identity.api_key_references — visible through owning service account's tenant
CREATE POLICY api_key_references_isolation ON identity.api_key_references
  USING (
    service_account_id IN (
      SELECT id FROM identity.service_accounts
      WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  );

-- platform tables — standard tenant isolation
CREATE POLICY businesses_isolation       ON platform.businesses         USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY org_units_isolation        ON platform.organization_units USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY departments_isolation      ON platform.departments        USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY locations_isolation        ON platform.locations          USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY customers_isolation        ON platform.customers          USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY suppliers_isolation        ON platform.suppliers          USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY employees_isolation        ON platform.employees          USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY products_isolation         ON platform.products           USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY services_isolation         ON platform.services           USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY orders_isolation           ON platform.orders             USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY invoices_isolation         ON platform.invoices           USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY payments_isolation         ON platform.payments           USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY inventory_items_isolation  ON platform.inventory_items    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY warehouses_isolation       ON platform.warehouses         USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY assets_isolation           ON platform.assets             USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY op_events_isolation        ON platform.operational_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY metrics_isolation          ON platform.metrics            USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY simulations_isolation      ON platform.simulations        USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY decisions_isolation        ON platform.decisions          USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY approved_actions_isolation ON platform.approved_actions   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY outcomes_isolation         ON platform.outcomes           USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY learning_items_isolation   ON platform.learning_items     USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- audit tables
CREATE POLICY audit_events_isolation    ON audit.audit_events    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY entity_versions_isolation ON audit.entity_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY access_events_isolation   ON audit.access_events
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- events tables
CREATE POLICY outbox_events_isolation ON events.outbox_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY inbox_events_isolation  ON events.inbox_events  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- files tables
CREATE POLICY file_objects_isolation      ON files.file_objects       USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY file_access_events_isolation ON files.file_access_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0011_create_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
