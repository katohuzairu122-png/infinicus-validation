-- Migration: 0035_create_bo_rls_policies
-- Stage 2C — Row Level Security for all business_operations tables
-- Pattern: tenant_id = app.tenant_id AND workspace_id = app.workspace_id (null-safe, fail-closed)

BEGIN;

-- ── helper: enable RLS on every BO table ──────────────────────────────────────

ALTER TABLE business_operations.business_profile_extensions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.department_responsibilities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.role_assignments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.leads                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.opportunities                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.opportunity_activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.customer_accounts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.quotations                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.quotation_line_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.order_line_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.order_events                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.invoice_line_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.payment_allocations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.credit_notes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.purchase_orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.purchase_order_line_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.purchase_receipts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.supplier_agreements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.supplier_performance_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.inventory_balances             ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.inventory_movements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.warehouse_zones                ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.storage_locations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.fulfilment_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.fulfilment_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.delivery_notes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.employee_assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.work_schedules                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.tasks                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.task_assignments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.workflow_instances             ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.resource_bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.maintenance_schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.maintenance_records            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.asset_inspections              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.expense_claims                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.expense_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.support_cases                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.case_activities                ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.compliance_controls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.risk_assessments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.incidents                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.incident_escalations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.operational_performance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.bo_publication_packages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.bo_handoff_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.bo_layer_assemblies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operations.bo_layer_deployments           ENABLE ROW LEVEL SECURITY;

-- ── RLS policies ──────────────────────────────────────────────────────────────

CREATE POLICY bpe_isolation ON business_operations.business_profile_extensions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY dept_resp_isolation ON business_operations.department_responsibilities
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY role_assign_isolation ON business_operations.role_assignments
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY leads_isolation ON business_operations.leads
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY opportunities_isolation ON business_operations.opportunities
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY opp_activities_isolation ON business_operations.opportunity_activities
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY customer_accounts_isolation ON business_operations.customer_accounts
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY quotations_isolation ON business_operations.quotations
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY quotation_line_items_isolation ON business_operations.quotation_line_items
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY order_line_items_isolation ON business_operations.order_line_items
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY order_events_isolation ON business_operations.order_events
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY invoice_line_items_isolation ON business_operations.invoice_line_items
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY payment_allocations_isolation ON business_operations.payment_allocations
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY credit_notes_isolation ON business_operations.credit_notes
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY purchase_orders_isolation ON business_operations.purchase_orders
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY po_line_items_isolation ON business_operations.purchase_order_line_items
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY purchase_receipts_isolation ON business_operations.purchase_receipts
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY supplier_agreements_isolation ON business_operations.supplier_agreements
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY supplier_perf_isolation ON business_operations.supplier_performance_scores
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY inventory_balances_isolation ON business_operations.inventory_balances
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY inventory_movements_isolation ON business_operations.inventory_movements
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY warehouse_zones_isolation ON business_operations.warehouse_zones
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY storage_locations_isolation ON business_operations.storage_locations
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY fulfilment_orders_isolation ON business_operations.fulfilment_orders
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY fulfilment_items_isolation ON business_operations.fulfilment_items
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY delivery_notes_isolation ON business_operations.delivery_notes
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY employee_assignments_isolation ON business_operations.employee_assignments
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY work_schedules_isolation ON business_operations.work_schedules
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY tasks_isolation ON business_operations.tasks
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY task_assignments_isolation ON business_operations.task_assignments
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY workflow_instances_isolation ON business_operations.workflow_instances
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY resource_bookings_isolation ON business_operations.resource_bookings
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY maintenance_schedules_isolation ON business_operations.maintenance_schedules
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY maintenance_records_isolation ON business_operations.maintenance_records
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY asset_inspections_isolation ON business_operations.asset_inspections
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY expense_claims_isolation ON business_operations.expense_claims
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY expense_items_isolation ON business_operations.expense_items
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY support_cases_isolation ON business_operations.support_cases
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY case_activities_isolation ON business_operations.case_activities
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY compliance_controls_isolation ON business_operations.compliance_controls
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY risk_assessments_isolation ON business_operations.risk_assessments
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY incidents_isolation ON business_operations.incidents
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY incident_escalations_isolation ON business_operations.incident_escalations
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY opr_isolation ON business_operations.operational_performance_records
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bo_pkg_isolation ON business_operations.bo_publication_packages
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bo_handoff_isolation ON business_operations.bo_handoff_records
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bo_assembly_isolation ON business_operations.bo_layer_assemblies
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bo_deploy_isolation ON business_operations.bo_layer_deployments
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

INSERT INTO _migrations (filename) VALUES ('0035_create_bo_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
