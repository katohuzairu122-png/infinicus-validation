-- Migration: 0105_create_aba_rls_policies
-- Stage 2H — Approved Business Action: RLS enabled and forced on all 46 tables
-- Null-safe fail-closed predicate, matching the Stage 2D/2E/2F/2G convention.

BEGIN;

ALTER TABLE approved_business_action.aba_intake_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_intake_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_intake_packages_tenant_isolation ON approved_business_action.aba_intake_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_intake_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_intake_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_intake_package_versions_tenant_isolation ON approved_business_action.aba_intake_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_intake_source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_intake_source_references FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_intake_source_references_tenant_isolation ON approved_business_action.aba_intake_source_references USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_intake_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_intake_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_intake_status_history_tenant_isolation ON approved_business_action.aba_intake_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_review_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_review_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY action_review_packages_tenant_isolation ON approved_business_action.action_review_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_review_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_review_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY action_review_package_versions_tenant_isolation ON approved_business_action.action_review_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_review_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_review_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY action_review_evidence_tenant_isolation ON approved_business_action.action_review_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_review_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_review_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY action_review_status_history_tenant_isolation ON approved_business_action.action_review_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_policies_tenant_isolation ON approved_business_action.approval_policies USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_policy_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_policy_versions_tenant_isolation ON approved_business_action.approval_policy_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_policy_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_policy_rules_tenant_isolation ON approved_business_action.approval_policy_rules USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_policy_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_policy_evaluations FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_policy_evaluations_tenant_isolation ON approved_business_action.approval_policy_evaluations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approver_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY approver_assignments_tenant_isolation ON approved_business_action.approver_assignments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approver_assignment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approver_assignment_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY approver_assignment_versions_tenant_isolation ON approved_business_action.approver_assignment_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_authority_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_authority_scopes FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_authority_scopes_tenant_isolation ON approved_business_action.approval_authority_scopes USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_delegations FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_delegations_tenant_isolation ON approved_business_action.approval_delegations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_decisions_tenant_isolation ON approved_business_action.approval_decisions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_decision_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_decision_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_decision_versions_tenant_isolation ON approved_business_action.approval_decision_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_decision_rationales ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_decision_rationales FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_decision_rationales_tenant_isolation ON approved_business_action.approval_decision_rationales USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_decision_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_decision_modifications FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_decision_modifications_tenant_isolation ON approved_business_action.approval_decision_modifications USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approved_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approved_actions FORCE ROW LEVEL SECURITY;
CREATE POLICY approved_actions_tenant_isolation ON approved_business_action.approved_actions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approved_action_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approved_action_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY approved_action_versions_tenant_isolation ON approved_business_action.approved_action_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approved_action_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approved_action_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY approved_action_steps_tenant_isolation ON approved_business_action.approved_action_steps USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approved_action_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approved_action_constraints FORCE ROW LEVEL SECURITY;
CREATE POLICY approved_action_constraints_tenant_isolation ON approved_business_action.approved_action_constraints USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_execution_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY action_execution_plans_tenant_isolation ON approved_business_action.action_execution_plans USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_execution_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_execution_plan_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY action_execution_plan_versions_tenant_isolation ON approved_business_action.action_execution_plan_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_execution_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_execution_dependencies FORCE ROW LEVEL SECURITY;
CREATE POLICY action_execution_dependencies_tenant_isolation ON approved_business_action.action_execution_dependencies USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_execution_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_execution_windows FORCE ROW LEVEL SECURITY;
CREATE POLICY action_execution_windows_tenant_isolation ON approved_business_action.action_execution_windows USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_control_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_control_gates FORCE ROW LEVEL SECURITY;
CREATE POLICY action_control_gates_tenant_isolation ON approved_business_action.action_control_gates USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_control_gate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_control_gate_evaluations FORCE ROW LEVEL SECURITY;
CREATE POLICY action_control_gate_evaluations_tenant_isolation ON approved_business_action.action_control_gate_evaluations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_holds FORCE ROW LEVEL SECURITY;
CREATE POLICY action_holds_tenant_isolation ON approved_business_action.action_holds USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.action_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.action_releases FORCE ROW LEVEL SECURITY;
CREATE POLICY action_releases_tenant_isolation ON approved_business_action.action_releases USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_exceptions FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_exceptions_tenant_isolation ON approved_business_action.approval_exceptions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_exception_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_exception_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_exception_evidence_tenant_isolation ON approved_business_action.approval_exception_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_appeals FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_appeals_tenant_isolation ON approved_business_action.approval_appeals USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_appeal_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_appeal_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_appeal_decisions_tenant_isolation ON approved_business_action.approval_appeal_decisions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_attestations FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_attestations_tenant_isolation ON approved_business_action.approval_attestations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_signatures FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_signatures_tenant_isolation ON approved_business_action.approval_signatures USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.approval_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.approval_audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY approval_audit_events_tenant_isolation ON approved_business_action.approval_audit_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_publication_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_publication_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_publication_packages_tenant_isolation ON approved_business_action.aba_publication_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_publication_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_publication_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_publication_package_versions_tenant_isolation ON approved_business_action.aba_publication_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_publication_events FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_publication_events_tenant_isolation ON approved_business_action.aba_publication_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_component_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_component_registry_tenant_isolation ON approved_business_action.aba_component_registry USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_component_registry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_component_registry_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_component_registry_versions_tenant_isolation ON approved_business_action.aba_component_registry_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_deployments FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_deployments_tenant_isolation ON approved_business_action.aba_deployments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE approved_business_action.aba_deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_business_action.aba_deployment_rollbacks FORCE ROW LEVEL SECURITY;
CREATE POLICY aba_deployment_rollbacks_tenant_isolation ON approved_business_action.aba_deployment_rollbacks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0105_create_aba_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
