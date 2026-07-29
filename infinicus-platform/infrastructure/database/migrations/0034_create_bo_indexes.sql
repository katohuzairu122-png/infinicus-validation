-- Migration: 0034_create_bo_indexes
-- Stage 2C — Indexes for all business_operations tables

BEGIN;

-- ── 0023 core profile ─────────────────────────────────────────────────────────
CREATE INDEX idx_bpe_tenant        ON business_operations.business_profile_extensions (tenant_id);
CREATE INDEX idx_bpe_workspace     ON business_operations.business_profile_extensions (workspace_id);
CREATE INDEX idx_bpe_business      ON business_operations.business_profile_extensions (business_id);

CREATE INDEX idx_dept_resp_tenant  ON business_operations.department_responsibilities (tenant_id);
CREATE INDEX idx_dept_resp_ws      ON business_operations.department_responsibilities (workspace_id);
CREATE INDEX idx_dept_resp_biz     ON business_operations.department_responsibilities (business_id);
CREATE INDEX idx_dept_resp_dept    ON business_operations.department_responsibilities (department_id);

CREATE INDEX idx_role_assign_tenant  ON business_operations.role_assignments (tenant_id);
CREATE INDEX idx_role_assign_ws      ON business_operations.role_assignments (workspace_id);
CREATE INDEX idx_role_assign_biz     ON business_operations.role_assignments (business_id);
CREATE INDEX idx_role_assign_emp     ON business_operations.role_assignments (employee_id);
CREATE INDEX idx_role_assign_valid   ON business_operations.role_assignments (valid_from, valid_to);

-- ── 0024 customer pipeline ────────────────────────────────────────────────────
CREATE INDEX idx_leads_tenant     ON business_operations.leads (tenant_id);
CREATE INDEX idx_leads_workspace  ON business_operations.leads (workspace_id);
CREATE INDEX idx_leads_business   ON business_operations.leads (business_id);
CREATE INDEX idx_leads_status     ON business_operations.leads (lead_status);
CREATE INDEX idx_leads_assigned   ON business_operations.leads (assigned_to);
CREATE INDEX idx_leads_customer   ON business_operations.leads (customer_id);

CREATE INDEX idx_opps_tenant      ON business_operations.opportunities (tenant_id);
CREATE INDEX idx_opps_workspace   ON business_operations.opportunities (workspace_id);
CREATE INDEX idx_opps_business    ON business_operations.opportunities (business_id);
CREATE INDEX idx_opps_customer    ON business_operations.opportunities (customer_id);
CREATE INDEX idx_opps_stage       ON business_operations.opportunities (stage);
CREATE INDEX idx_opps_assigned    ON business_operations.opportunities (assigned_to);
CREATE INDEX idx_opps_close_date  ON business_operations.opportunities (expected_close_date);

CREATE INDEX idx_opp_acts_tenant  ON business_operations.opportunity_activities (tenant_id);
CREATE INDEX idx_opp_acts_opp     ON business_operations.opportunity_activities (opportunity_id);
CREATE INDEX idx_opp_acts_at      ON business_operations.opportunity_activities (occurred_at);

CREATE INDEX idx_cust_accts_tenant ON business_operations.customer_accounts (tenant_id);
CREATE INDEX idx_cust_accts_ws    ON business_operations.customer_accounts (workspace_id);
CREATE INDEX idx_cust_accts_biz   ON business_operations.customer_accounts (business_id);
CREATE INDEX idx_cust_accts_cust  ON business_operations.customer_accounts (customer_id);
CREATE INDEX idx_cust_accts_mgr   ON business_operations.customer_accounts (account_manager_id);

-- ── 0025 quotations & orders ──────────────────────────────────────────────────
CREATE INDEX idx_quotes_tenant    ON business_operations.quotations (tenant_id);
CREATE INDEX idx_quotes_workspace ON business_operations.quotations (workspace_id);
CREATE INDEX idx_quotes_business  ON business_operations.quotations (business_id);
CREATE INDEX idx_quotes_customer  ON business_operations.quotations (customer_id);
CREATE INDEX idx_quotes_status    ON business_operations.quotations (quotation_status);
CREATE INDEX idx_quotes_issue     ON business_operations.quotations (issue_date);

CREATE INDEX idx_ql_items_tenant  ON business_operations.quotation_line_items (tenant_id);
CREATE INDEX idx_ql_items_quote   ON business_operations.quotation_line_items (quotation_id);

CREATE INDEX idx_ol_items_tenant  ON business_operations.order_line_items (tenant_id);
CREATE INDEX idx_ol_items_order   ON business_operations.order_line_items (order_id);
CREATE INDEX idx_ol_items_product ON business_operations.order_line_items (product_id);

CREATE INDEX idx_order_events_tenant ON business_operations.order_events (tenant_id);
CREATE INDEX idx_order_events_order  ON business_operations.order_events (order_id);
CREATE INDEX idx_order_events_at     ON business_operations.order_events (occurred_at);

-- ── 0026 billing & procurement ────────────────────────────────────────────────
CREATE INDEX idx_inv_lines_tenant  ON business_operations.invoice_line_items (tenant_id);
CREATE INDEX idx_inv_lines_invoice ON business_operations.invoice_line_items (invoice_id);

CREATE INDEX idx_pay_alloc_tenant  ON business_operations.payment_allocations (tenant_id);
CREATE INDEX idx_pay_alloc_payment ON business_operations.payment_allocations (payment_id);
CREATE INDEX idx_pay_alloc_invoice ON business_operations.payment_allocations (invoice_id);

CREATE INDEX idx_credit_notes_tenant   ON business_operations.credit_notes (tenant_id);
CREATE INDEX idx_credit_notes_ws       ON business_operations.credit_notes (workspace_id);
CREATE INDEX idx_credit_notes_biz      ON business_operations.credit_notes (business_id);
CREATE INDEX idx_credit_notes_customer ON business_operations.credit_notes (customer_id);
CREATE INDEX idx_credit_notes_invoice  ON business_operations.credit_notes (invoice_id);

CREATE INDEX idx_po_tenant      ON business_operations.purchase_orders (tenant_id);
CREATE INDEX idx_po_workspace   ON business_operations.purchase_orders (workspace_id);
CREATE INDEX idx_po_business    ON business_operations.purchase_orders (business_id);
CREATE INDEX idx_po_supplier    ON business_operations.purchase_orders (supplier_id);
CREATE INDEX idx_po_status      ON business_operations.purchase_orders (po_status);
CREATE INDEX idx_po_date        ON business_operations.purchase_orders (order_date);

CREATE INDEX idx_po_lines_tenant ON business_operations.purchase_order_line_items (tenant_id);
CREATE INDEX idx_po_lines_po     ON business_operations.purchase_order_line_items (purchase_order_id);

CREATE INDEX idx_pr_tenant  ON business_operations.purchase_receipts (tenant_id);
CREATE INDEX idx_pr_po      ON business_operations.purchase_receipts (purchase_order_id);
CREATE INDEX idx_pr_at      ON business_operations.purchase_receipts (received_at);

-- ── 0027 supplier & inventory ─────────────────────────────────────────────────
CREATE INDEX idx_sup_agmt_tenant    ON business_operations.supplier_agreements (tenant_id);
CREATE INDEX idx_sup_agmt_ws        ON business_operations.supplier_agreements (workspace_id);
CREATE INDEX idx_sup_agmt_biz       ON business_operations.supplier_agreements (business_id);
CREATE INDEX idx_sup_agmt_supplier  ON business_operations.supplier_agreements (supplier_id);
CREATE INDEX idx_sup_agmt_status    ON business_operations.supplier_agreements (agreement_status);

CREATE INDEX idx_sup_perf_tenant    ON business_operations.supplier_performance_scores (tenant_id);
CREATE INDEX idx_sup_perf_supplier  ON business_operations.supplier_performance_scores (supplier_id);
CREATE INDEX idx_sup_perf_period    ON business_operations.supplier_performance_scores (period_start, period_end);

CREATE INDEX idx_inv_bal_tenant     ON business_operations.inventory_balances (tenant_id);
CREATE INDEX idx_inv_bal_ws         ON business_operations.inventory_balances (workspace_id);
CREATE INDEX idx_inv_bal_biz        ON business_operations.inventory_balances (business_id);
CREATE INDEX idx_inv_bal_item       ON business_operations.inventory_balances (inventory_item_id);
CREATE INDEX idx_inv_bal_warehouse  ON business_operations.inventory_balances (warehouse_id);

CREATE INDEX idx_inv_mov_tenant     ON business_operations.inventory_movements (tenant_id);
CREATE INDEX idx_inv_mov_ws         ON business_operations.inventory_movements (workspace_id);
CREATE INDEX idx_inv_mov_item       ON business_operations.inventory_movements (inventory_item_id);
CREATE INDEX idx_inv_mov_warehouse  ON business_operations.inventory_movements (warehouse_id);
CREATE INDEX idx_inv_mov_type       ON business_operations.inventory_movements (movement_type);
CREATE INDEX idx_inv_mov_at         ON business_operations.inventory_movements (occurred_at);

-- ── 0028 warehouse & fulfilment ───────────────────────────────────────────────
CREATE INDEX idx_wh_zones_tenant    ON business_operations.warehouse_zones (tenant_id);
CREATE INDEX idx_wh_zones_wh        ON business_operations.warehouse_zones (warehouse_id);

CREATE INDEX idx_stor_locs_tenant   ON business_operations.storage_locations (tenant_id);
CREATE INDEX idx_stor_locs_zone     ON business_operations.storage_locations (zone_id);

CREATE INDEX idx_ful_orders_tenant  ON business_operations.fulfilment_orders (tenant_id);
CREATE INDEX idx_ful_orders_ws      ON business_operations.fulfilment_orders (workspace_id);
CREATE INDEX idx_ful_orders_biz     ON business_operations.fulfilment_orders (business_id);
CREATE INDEX idx_ful_orders_order   ON business_operations.fulfilment_orders (order_id);
CREATE INDEX idx_ful_orders_wh      ON business_operations.fulfilment_orders (warehouse_id);
CREATE INDEX idx_ful_orders_status  ON business_operations.fulfilment_orders (fulfilment_status);

CREATE INDEX idx_ful_items_tenant   ON business_operations.fulfilment_items (tenant_id);
CREATE INDEX idx_ful_items_fo       ON business_operations.fulfilment_items (fulfilment_order_id);

CREATE INDEX idx_del_notes_tenant   ON business_operations.delivery_notes (tenant_id);
CREATE INDEX idx_del_notes_fo       ON business_operations.delivery_notes (fulfilment_order_id);
CREATE INDEX idx_del_notes_at       ON business_operations.delivery_notes (delivered_at);

-- ── 0029 workforce & tasks ────────────────────────────────────────────────────
CREATE INDEX idx_emp_assign_tenant  ON business_operations.employee_assignments (tenant_id);
CREATE INDEX idx_emp_assign_ws      ON business_operations.employee_assignments (workspace_id);
CREATE INDEX idx_emp_assign_biz     ON business_operations.employee_assignments (business_id);
CREATE INDEX idx_emp_assign_emp     ON business_operations.employee_assignments (employee_id);
CREATE INDEX idx_emp_assign_period  ON business_operations.employee_assignments (valid_from, valid_to);

CREATE INDEX idx_work_sched_tenant  ON business_operations.work_schedules (tenant_id);
CREATE INDEX idx_work_sched_emp     ON business_operations.work_schedules (employee_id);

CREATE INDEX idx_tasks_tenant       ON business_operations.tasks (tenant_id);
CREATE INDEX idx_tasks_ws           ON business_operations.tasks (workspace_id);
CREATE INDEX idx_tasks_biz          ON business_operations.tasks (business_id);
CREATE INDEX idx_tasks_status       ON business_operations.tasks (task_status);
CREATE INDEX idx_tasks_due          ON business_operations.tasks (due_date);
CREATE INDEX idx_tasks_parent       ON business_operations.tasks (parent_task_id);

CREATE INDEX idx_task_assign_tenant ON business_operations.task_assignments (tenant_id);
CREATE INDEX idx_task_assign_task   ON business_operations.task_assignments (task_id);
CREATE INDEX idx_task_assign_emp    ON business_operations.task_assignments (employee_id);

CREATE INDEX idx_workflow_tenant    ON business_operations.workflow_instances (tenant_id);
CREATE INDEX idx_workflow_ws        ON business_operations.workflow_instances (workspace_id);
CREATE INDEX idx_workflow_biz       ON business_operations.workflow_instances (business_id);
CREATE INDEX idx_workflow_status    ON business_operations.workflow_instances (workflow_status);
CREATE INDEX idx_workflow_type      ON business_operations.workflow_instances (workflow_type);

-- ── 0030 scheduling & assets ──────────────────────────────────────────────────
CREATE INDEX idx_res_book_tenant    ON business_operations.resource_bookings (tenant_id);
CREATE INDEX idx_res_book_ws        ON business_operations.resource_bookings (workspace_id);
CREATE INDEX idx_res_book_biz       ON business_operations.resource_bookings (business_id);
CREATE INDEX idx_res_book_starts    ON business_operations.resource_bookings (starts_at, ends_at);
CREATE INDEX idx_res_book_status    ON business_operations.resource_bookings (booking_status);

CREATE INDEX idx_maint_sched_tenant ON business_operations.maintenance_schedules (tenant_id);
CREATE INDEX idx_maint_sched_asset  ON business_operations.maintenance_schedules (asset_id);
CREATE INDEX idx_maint_sched_due    ON business_operations.maintenance_schedules (next_due_date);

CREATE INDEX idx_maint_rec_tenant   ON business_operations.maintenance_records (tenant_id);
CREATE INDEX idx_maint_rec_asset    ON business_operations.maintenance_records (asset_id);
CREATE INDEX idx_maint_rec_at       ON business_operations.maintenance_records (started_at);

CREATE INDEX idx_asset_insp_tenant  ON business_operations.asset_inspections (tenant_id);
CREATE INDEX idx_asset_insp_asset   ON business_operations.asset_inspections (asset_id);
CREATE INDEX idx_asset_insp_at      ON business_operations.asset_inspections (inspected_at);

-- ── 0031 finance & support ────────────────────────────────────────────────────
CREATE INDEX idx_exp_claims_tenant  ON business_operations.expense_claims (tenant_id);
CREATE INDEX idx_exp_claims_ws      ON business_operations.expense_claims (workspace_id);
CREATE INDEX idx_exp_claims_biz     ON business_operations.expense_claims (business_id);
CREATE INDEX idx_exp_claims_emp     ON business_operations.expense_claims (employee_id);
CREATE INDEX idx_exp_claims_status  ON business_operations.expense_claims (claim_status);

CREATE INDEX idx_exp_items_tenant   ON business_operations.expense_items (tenant_id);
CREATE INDEX idx_exp_items_claim    ON business_operations.expense_items (expense_claim_id);

CREATE INDEX idx_sup_cases_tenant   ON business_operations.support_cases (tenant_id);
CREATE INDEX idx_sup_cases_ws       ON business_operations.support_cases (workspace_id);
CREATE INDEX idx_sup_cases_biz      ON business_operations.support_cases (business_id);
CREATE INDEX idx_sup_cases_customer ON business_operations.support_cases (customer_id);
CREATE INDEX idx_sup_cases_status   ON business_operations.support_cases (case_status);
CREATE INDEX idx_sup_cases_assigned ON business_operations.support_cases (assigned_to);
CREATE INDEX idx_sup_cases_opened   ON business_operations.support_cases (opened_at);

CREATE INDEX idx_case_acts_tenant   ON business_operations.case_activities (tenant_id);
CREATE INDEX idx_case_acts_case     ON business_operations.case_activities (support_case_id);
CREATE INDEX idx_case_acts_at       ON business_operations.case_activities (occurred_at);

-- ── 0032 risk & incidents ─────────────────────────────────────────────────────
CREATE INDEX idx_cc_tenant          ON business_operations.compliance_controls (tenant_id);
CREATE INDEX idx_cc_ws              ON business_operations.compliance_controls (workspace_id);
CREATE INDEX idx_cc_biz             ON business_operations.compliance_controls (business_id);
CREATE INDEX idx_cc_status          ON business_operations.compliance_controls (control_status);
CREATE INDEX idx_cc_next_review     ON business_operations.compliance_controls (next_review_date);

CREATE INDEX idx_risk_tenant        ON business_operations.risk_assessments (tenant_id);
CREATE INDEX idx_risk_ws            ON business_operations.risk_assessments (workspace_id);
CREATE INDEX idx_risk_biz           ON business_operations.risk_assessments (business_id);
CREATE INDEX idx_risk_level         ON business_operations.risk_assessments (risk_level);
CREATE INDEX idx_risk_status        ON business_operations.risk_assessments (assessment_status);

CREATE INDEX idx_incidents_tenant   ON business_operations.incidents (tenant_id);
CREATE INDEX idx_incidents_ws       ON business_operations.incidents (workspace_id);
CREATE INDEX idx_incidents_biz      ON business_operations.incidents (business_id);
CREATE INDEX idx_incidents_status   ON business_operations.incidents (incident_status);
CREATE INDEX idx_incidents_severity ON business_operations.incidents (severity);
CREATE INDEX idx_incidents_occurred ON business_operations.incidents (occurred_at);

CREATE INDEX idx_inc_esc_tenant     ON business_operations.incident_escalations (tenant_id);
CREATE INDEX idx_inc_esc_incident   ON business_operations.incident_escalations (incident_id);
CREATE INDEX idx_inc_esc_at         ON business_operations.incident_escalations (occurred_at);

-- ── 0033 performance & publication ───────────────────────────────────────────
CREATE INDEX idx_opr_tenant         ON business_operations.operational_performance_records (tenant_id);
CREATE INDEX idx_opr_ws             ON business_operations.operational_performance_records (workspace_id);
CREATE INDEX idx_opr_biz            ON business_operations.operational_performance_records (business_id);
CREATE INDEX idx_opr_code           ON business_operations.operational_performance_records (metric_code);
CREATE INDEX idx_opr_category       ON business_operations.operational_performance_records (metric_category);
CREATE INDEX idx_opr_period         ON business_operations.operational_performance_records (period_start, period_end);

CREATE INDEX idx_bo_pkg_tenant      ON business_operations.bo_publication_packages (tenant_id);
CREATE INDEX idx_bo_pkg_ws          ON business_operations.bo_publication_packages (workspace_id);
CREATE INDEX idx_bo_pkg_biz         ON business_operations.bo_publication_packages (business_id);
CREATE INDEX idx_bo_pkg_status      ON business_operations.bo_publication_packages (package_status);
CREATE INDEX idx_bo_pkg_target      ON business_operations.bo_publication_packages (target_layer, target_block);

CREATE INDEX idx_bo_handoff_tenant  ON business_operations.bo_handoff_records (tenant_id);
CREATE INDEX idx_bo_handoff_pkg     ON business_operations.bo_handoff_records (publication_id);
CREATE INDEX idx_bo_handoff_at      ON business_operations.bo_handoff_records (occurred_at);

CREATE INDEX idx_bo_assembly_tenant ON business_operations.bo_layer_assemblies (tenant_id);
CREATE INDEX idx_bo_assembly_ws     ON business_operations.bo_layer_assemblies (workspace_id);
CREATE INDEX idx_bo_assembly_state  ON business_operations.bo_layer_assemblies (state);

CREATE INDEX idx_bo_deploy_tenant   ON business_operations.bo_layer_deployments (tenant_id);
CREATE INDEX idx_bo_deploy_assembly ON business_operations.bo_layer_deployments (assembly_id);
CREATE INDEX idx_bo_deploy_at       ON business_operations.bo_layer_deployments (deployed_at);

INSERT INTO _migrations (filename) VALUES ('0034_create_bo_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
