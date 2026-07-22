-- Migration: 0061_create_dt_rls_policies
-- Stage 2E — Business Digital Twin: RLS enabled and forced on all 51 tables
-- Null-safe fail-closed predicate, matching the Stage 2D convention.

BEGIN;

ALTER TABLE business_digital_twin.dt_intake_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_intake_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_intake_packages_tenant_isolation ON business_digital_twin.dt_intake_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_intake_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_intake_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_intake_package_versions_tenant_isolation ON business_digital_twin.dt_intake_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_intake_source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_intake_source_references FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_intake_source_references_tenant_isolation ON business_digital_twin.dt_intake_source_references USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_intake_processing_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_intake_processing_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_intake_processing_status_history_tenant_isolation ON business_digital_twin.dt_intake_processing_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_definitions FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_definitions_tenant_isolation ON business_digital_twin.digital_twin_definitions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_definition_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_definition_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_definition_versions_tenant_isolation ON business_digital_twin.digital_twin_definition_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_definition_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_definition_components FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_definition_components_tenant_isolation ON business_digital_twin.digital_twin_definition_components USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_definition_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_definition_relationships FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_definition_relationships_tenant_isolation ON business_digital_twin.digital_twin_definition_relationships USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_instances FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_instances_tenant_isolation ON business_digital_twin.digital_twin_instances USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_instance_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_instance_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_instance_versions_tenant_isolation ON business_digital_twin.digital_twin_instance_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_instance_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_instance_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_instance_status_history_tenant_isolation ON business_digital_twin.digital_twin_instance_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.state_variable_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.state_variable_definitions FORCE ROW LEVEL SECURITY;
CREATE POLICY state_variable_definitions_tenant_isolation ON business_digital_twin.state_variable_definitions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.state_variable_definition_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.state_variable_definition_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY state_variable_definition_versions_tenant_isolation ON business_digital_twin.state_variable_definition_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.state_variable_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.state_variable_values FORCE ROW LEVEL SECURITY;
CREATE POLICY state_variable_values_tenant_isolation ON business_digital_twin.state_variable_values USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.state_variable_value_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.state_variable_value_quality FORCE ROW LEVEL SECURITY;
CREATE POLICY state_variable_value_quality_tenant_isolation ON business_digital_twin.state_variable_value_quality USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_snapshots_tenant_isolation ON business_digital_twin.digital_twin_snapshots USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_snapshot_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_snapshot_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_snapshot_versions_tenant_isolation ON business_digital_twin.digital_twin_snapshot_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_snapshot_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_snapshot_values FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_snapshot_values_tenant_isolation ON business_digital_twin.digital_twin_snapshot_values USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_snapshot_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_snapshot_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_snapshot_evidence_tenant_isolation ON business_digital_twin.digital_twin_snapshot_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.digital_twin_snapshot_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.digital_twin_snapshot_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY digital_twin_snapshot_status_history_tenant_isolation ON business_digital_twin.digital_twin_snapshot_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_entities FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_entities_tenant_isolation ON business_digital_twin.twin_entities USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_entity_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_entity_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_entity_versions_tenant_isolation ON business_digital_twin.twin_entity_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_relationships FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_relationships_tenant_isolation ON business_digital_twin.twin_relationships USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_relationship_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_relationship_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_relationship_versions_tenant_isolation ON business_digital_twin.twin_relationship_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_assumptions FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_assumptions_tenant_isolation ON business_digital_twin.twin_assumptions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_assumption_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_assumption_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_assumption_versions_tenant_isolation ON business_digital_twin.twin_assumption_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_constraints FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_constraints_tenant_isolation ON business_digital_twin.twin_constraints USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_constraint_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_constraint_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_constraint_versions_tenant_isolation ON business_digital_twin.twin_constraint_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_constraint_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_constraint_evaluations FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_constraint_evaluations_tenant_isolation ON business_digital_twin.twin_constraint_evaluations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_calibration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_calibration_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_calibration_runs_tenant_isolation ON business_digital_twin.twin_calibration_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_calibration_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_calibration_inputs FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_calibration_inputs_tenant_isolation ON business_digital_twin.twin_calibration_inputs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_calibration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_calibration_results FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_calibration_results_tenant_isolation ON business_digital_twin.twin_calibration_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_validation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_validation_runs_tenant_isolation ON business_digital_twin.twin_validation_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_validation_results FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_validation_results_tenant_isolation ON business_digital_twin.twin_validation_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_validation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_validation_issues FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_validation_issues_tenant_isolation ON business_digital_twin.twin_validation_issues USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_uncertainty_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_uncertainty_models FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_uncertainty_models_tenant_isolation ON business_digital_twin.twin_uncertainty_models USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_uncertainty_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_uncertainty_model_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_uncertainty_model_versions_tenant_isolation ON business_digital_twin.twin_uncertainty_model_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_uncertainty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_uncertainty_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_uncertainty_assignments_tenant_isolation ON business_digital_twin.twin_uncertainty_assignments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.twin_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.twin_confidence_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY twin_confidence_scores_tenant_isolation ON business_digital_twin.twin_confidence_scores USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.scenario_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.scenario_baselines FORCE ROW LEVEL SECURITY;
CREATE POLICY scenario_baselines_tenant_isolation ON business_digital_twin.scenario_baselines USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.scenario_baseline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.scenario_baseline_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY scenario_baseline_versions_tenant_isolation ON business_digital_twin.scenario_baseline_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.scenario_baseline_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.scenario_baseline_inputs FORCE ROW LEVEL SECURITY;
CREATE POLICY scenario_baseline_inputs_tenant_isolation ON business_digital_twin.scenario_baseline_inputs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.scenario_baseline_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.scenario_baseline_constraints FORCE ROW LEVEL SECURITY;
CREATE POLICY scenario_baseline_constraints_tenant_isolation ON business_digital_twin.scenario_baseline_constraints USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_insight_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_insight_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_insight_packages_tenant_isolation ON business_digital_twin.dt_insight_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_insight_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_insight_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_insight_package_versions_tenant_isolation ON business_digital_twin.dt_insight_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_publication_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_publication_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_publication_packages_tenant_isolation ON business_digital_twin.dt_publication_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_publication_events FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_publication_events_tenant_isolation ON business_digital_twin.dt_publication_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_component_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_component_registry_tenant_isolation ON business_digital_twin.dt_component_registry USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_component_registry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_component_registry_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_component_registry_versions_tenant_isolation ON business_digital_twin.dt_component_registry_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_deployments FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_deployments_tenant_isolation ON business_digital_twin.dt_deployments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE business_digital_twin.dt_deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_digital_twin.dt_deployment_rollbacks FORCE ROW LEVEL SECURITY;
CREATE POLICY dt_deployment_rollbacks_tenant_isolation ON business_digital_twin.dt_deployment_rollbacks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0061_create_dt_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
