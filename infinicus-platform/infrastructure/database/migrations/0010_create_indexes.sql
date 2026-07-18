-- Migration: 0010_create_indexes
-- Stage 2A — Indexes across all Stage 2A schemas
-- Covers: tenancy, identity, platform, audit, events, files

BEGIN;

-- ── tenancy ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_t_tenants_slug         ON tenancy.tenants (slug)       WHERE deleted_at IS NULL;
CREATE INDEX idx_t_tenants_status       ON tenancy.tenants (status);
CREATE INDEX idx_t_workspaces_tenant    ON tenancy.workspaces (tenant_id);
CREATE INDEX idx_t_workspaces_status    ON tenancy.workspaces (tenant_id, status);
CREATE INDEX idx_t_memberships_tenant   ON tenancy.memberships (tenant_id, workspace_id);
CREATE INDEX idx_t_memberships_user     ON tenancy.memberships (user_id);
CREATE INDEX idx_t_memberships_status   ON tenancy.memberships (tenant_id, status);
CREATE INDEX idx_t_roles_tenant         ON tenancy.roles (tenant_id);
CREATE INDEX idx_t_roles_scope          ON tenancy.roles (scope, is_system);
CREATE INDEX idx_t_invitations_tenant   ON tenancy.invitations (tenant_id, workspace_id);
CREATE INDEX idx_t_invitations_email    ON tenancy.invitations (email);
CREATE INDEX idx_t_invitations_status   ON tenancy.invitations (status) WHERE status = 'pending';

-- ── identity ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_i_users_email          ON identity.users (email)        WHERE deleted_at IS NULL;
CREATE INDEX idx_i_users_status         ON identity.users (status);
CREATE INDEX idx_i_svc_tenant           ON identity.service_accounts (tenant_id, workspace_id);
CREATE INDEX idx_i_svc_status           ON identity.service_accounts (tenant_id, status);
CREATE INDEX idx_i_apikeys_svc          ON identity.api_key_references (service_account_id);
CREATE INDEX idx_i_apikeys_expires      ON identity.api_key_references (expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_i_sessions_user        ON identity.sessions (user_id);
CREATE INDEX idx_i_sessions_expires     ON identity.sessions (expires_at) WHERE revoked_at IS NULL;

-- ── platform ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_p_biz_tenant           ON platform.businesses (tenant_id, workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_p_biz_status           ON platform.businesses (tenant_id, status);
CREATE INDEX idx_p_biz_correlation      ON platform.businesses (correlation_id);
CREATE INDEX idx_p_ou_business          ON platform.organization_units (tenant_id, business_id);
CREATE INDEX idx_p_ou_parent            ON platform.organization_units (parent_unit_id);
CREATE INDEX idx_p_dept_business        ON platform.departments (business_id);
CREATE INDEX idx_p_loc_business         ON platform.locations (business_id);
CREATE INDEX idx_p_cust_tenant          ON platform.customers (tenant_id, business_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_p_cust_email           ON platform.customers (email);
CREATE INDEX idx_p_sup_business         ON platform.suppliers (business_id)              WHERE deleted_at IS NULL;
CREATE INDEX idx_p_emp_business         ON platform.employees (business_id)              WHERE deleted_at IS NULL;
CREATE INDEX idx_p_emp_user             ON platform.employees (user_id);
CREATE INDEX idx_p_prod_business        ON platform.products (business_id)               WHERE deleted_at IS NULL;
CREATE INDEX idx_p_svc_business         ON platform.services (business_id)               WHERE deleted_at IS NULL;
CREATE INDEX idx_p_ord_tenant           ON platform.orders (tenant_id, business_id);
CREATE INDEX idx_p_ord_customer         ON platform.orders (customer_id);
CREATE INDEX idx_p_ord_opstatus         ON platform.orders (tenant_id, operational_status);
CREATE INDEX idx_p_inv_business         ON platform.invoices (business_id);
CREATE INDEX idx_p_inv_customer         ON platform.invoices (customer_id);
CREATE INDEX idx_p_inv_order            ON platform.invoices (order_id);
CREATE INDEX idx_p_pay_business         ON platform.payments (business_id);
CREATE INDEX idx_p_pay_invoice          ON platform.payments (invoice_id);
CREATE INDEX idx_p_invent_business      ON platform.inventory_items (business_id);
CREATE INDEX idx_p_wh_business          ON platform.warehouses (business_id);
CREATE INDEX idx_p_asset_business       ON platform.assets (business_id);
CREATE INDEX idx_p_opev_tenant          ON platform.operational_events (tenant_id, business_id);
CREATE INDEX idx_p_opev_entity          ON platform.operational_events (entity_type, entity_id);
CREATE INDEX idx_p_met_tenant           ON platform.metrics (tenant_id, business_id);
CREATE INDEX idx_p_met_measured         ON platform.metrics (business_id, measured_at DESC);
CREATE INDEX idx_p_sim_business         ON platform.simulations (business_id);
CREATE INDEX idx_p_sim_status           ON platform.simulations (tenant_id, status);
CREATE INDEX idx_p_dec_business         ON platform.decisions (business_id);
CREATE INDEX idx_p_dec_status           ON platform.decisions (tenant_id, status);
CREATE INDEX idx_p_aa_business          ON platform.approved_actions (business_id);
CREATE INDEX idx_p_aa_decision          ON platform.approved_actions (decision_id);
CREATE INDEX idx_p_out_business         ON platform.outcomes (business_id);
CREATE INDEX idx_p_out_aa               ON platform.outcomes (approved_action_id);
CREATE INDEX idx_p_learn_business       ON platform.learning_items (business_id);
CREATE INDEX idx_p_learn_outcome        ON platform.learning_items (outcome_id);

-- ── audit ─────────────────────────────────────────────────────────────────────

CREATE INDEX idx_a_events_tenant        ON audit.audit_events (tenant_id, occurred_at DESC);
CREATE INDEX idx_a_events_workspace     ON audit.audit_events (workspace_id, occurred_at DESC);
CREATE INDEX idx_a_events_entity        ON audit.audit_events (entity_type, entity_id);
CREATE INDEX idx_a_events_actor         ON audit.audit_events (actor_type, actor_id);
CREATE INDEX idx_a_events_correlation   ON audit.audit_events (correlation_id);
CREATE INDEX idx_a_versions_entity      ON audit.entity_versions (entity_type, entity_id, entity_version DESC);
CREATE INDEX idx_a_versions_tenant      ON audit.entity_versions (tenant_id, created_at DESC);
CREATE INDEX idx_a_access_user          ON audit.access_events (user_id, occurred_at DESC);
CREATE INDEX idx_a_access_tenant        ON audit.access_events (tenant_id, occurred_at DESC);
CREATE INDEX idx_a_access_type          ON audit.access_events (event_type, occurred_at DESC);

-- ── events ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_e_outbox_pending       ON events.outbox_events (status, available_at)
  WHERE status IN ('pending','failed');
CREATE INDEX idx_e_outbox_tenant        ON events.outbox_events (tenant_id, event_type);
CREATE INDEX idx_e_outbox_correlation   ON events.outbox_events (correlation_id);
CREATE INDEX idx_e_outbox_aggregate     ON events.outbox_events (aggregate_type, aggregate_id);
CREATE INDEX idx_e_inbox_tenant         ON events.inbox_events (tenant_id, event_type);
CREATE INDEX idx_e_inbox_status         ON events.inbox_events (status);
CREATE INDEX idx_e_delivery_outbox      ON events.event_delivery_attempts (outbox_event_id);

-- ── files ─────────────────────────────────────────────────────────────────────

CREATE INDEX idx_f_obj_tenant           ON files.file_objects (tenant_id, workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_f_obj_hash             ON files.file_objects (sha256_hash);
CREATE INDEX idx_f_links_entity         ON files.file_links (entity_type, entity_id);
CREATE INDEX idx_f_links_file           ON files.file_links (file_object_id);
CREATE INDEX idx_f_access_file          ON files.file_access_events (file_object_id, occurred_at DESC);
CREATE INDEX idx_f_access_tenant        ON files.file_access_events (tenant_id, occurred_at DESC);

INSERT INTO _migrations (filename) VALUES ('0010_create_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
