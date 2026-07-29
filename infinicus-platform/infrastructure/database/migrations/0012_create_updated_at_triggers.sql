-- Migration: 0012_create_updated_at_triggers
-- Stage 2A — updated_at triggers for all mutable Stage 2A tables
-- Reuses set_updated_at() defined in 0001_foundation.sql (public schema).
-- Not applied to append-only tables (audit, access_events, event_delivery_attempts, etc.)

BEGIN;

-- tenancy
CREATE TRIGGER trg_tenancy_tenants_updated_at
  BEFORE UPDATE ON tenancy.tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tenancy_workspaces_updated_at
  BEFORE UPDATE ON tenancy.workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tenancy_memberships_updated_at
  BEFORE UPDATE ON tenancy.memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tenancy_roles_updated_at
  BEFORE UPDATE ON tenancy.roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- identity
CREATE TRIGGER trg_identity_users_updated_at
  BEFORE UPDATE ON identity.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_identity_user_profiles_updated_at
  BEFORE UPDATE ON identity.user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_identity_service_accounts_updated_at
  BEFORE UPDATE ON identity.service_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_identity_sessions_updated_at
  BEFORE UPDATE ON identity.sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- platform core
CREATE TRIGGER trg_platform_businesses_updated_at
  BEFORE UPDATE ON platform.businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_org_units_updated_at
  BEFORE UPDATE ON platform.organization_units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_departments_updated_at
  BEFORE UPDATE ON platform.departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_locations_updated_at
  BEFORE UPDATE ON platform.locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_system_settings_updated_at
  BEFORE UPDATE ON platform.system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_feature_flags_updated_at
  BEFORE UPDATE ON platform.feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- platform canonical entities
CREATE TRIGGER trg_platform_customers_updated_at
  BEFORE UPDATE ON platform.customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_suppliers_updated_at
  BEFORE UPDATE ON platform.suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_employees_updated_at
  BEFORE UPDATE ON platform.employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_products_updated_at
  BEFORE UPDATE ON platform.products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_services_updated_at
  BEFORE UPDATE ON platform.services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_orders_updated_at
  BEFORE UPDATE ON platform.orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_invoices_updated_at
  BEFORE UPDATE ON platform.invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_payments_updated_at
  BEFORE UPDATE ON platform.payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_inventory_items_updated_at
  BEFORE UPDATE ON platform.inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_warehouses_updated_at
  BEFORE UPDATE ON platform.warehouses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_assets_updated_at
  BEFORE UPDATE ON platform.assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_simulations_updated_at
  BEFORE UPDATE ON platform.simulations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_decisions_updated_at
  BEFORE UPDATE ON platform.decisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_approved_actions_updated_at
  BEFORE UPDATE ON platform.approved_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_outcomes_updated_at
  BEFORE UPDATE ON platform.outcomes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_platform_learning_items_updated_at
  BEFORE UPDATE ON platform.learning_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- events
CREATE TRIGGER trg_events_subscriptions_updated_at
  BEFORE UPDATE ON events.event_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- files
CREATE TRIGGER trg_files_file_objects_updated_at
  BEFORE UPDATE ON files.file_objects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO _migrations (filename) VALUES ('0012_create_updated_at_triggers.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
