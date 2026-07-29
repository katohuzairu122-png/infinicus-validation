-- Migration: 0075_create_sim_rls_policies
-- Stage 2F — Simulation: RLS enabled and forced on all 44 tables
-- Null-safe fail-closed predicate, matching the Stage 2D/2E convention.

BEGIN;

ALTER TABLE simulation.simulation_intake_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_intake_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_intake_packages_tenant_isolation ON simulation.simulation_intake_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_intake_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_intake_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_intake_package_versions_tenant_isolation ON simulation.simulation_intake_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_intake_source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_intake_source_references FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_intake_source_references_tenant_isolation ON simulation.simulation_intake_source_references USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_intake_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_intake_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_intake_status_history_tenant_isolation ON simulation.simulation_intake_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_models FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_models_tenant_isolation ON simulation.simulation_models USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_model_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_model_versions_tenant_isolation ON simulation.simulation_model_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_model_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_model_parameters FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_model_parameters_tenant_isolation ON simulation.simulation_model_parameters USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_model_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_model_constraints FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_model_constraints_tenant_isolation ON simulation.simulation_model_constraints USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_scenarios FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_scenarios_tenant_isolation ON simulation.simulation_scenarios USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_scenario_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_scenario_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_scenario_versions_tenant_isolation ON simulation.simulation_scenario_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_scenario_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_scenario_inputs FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_scenario_inputs_tenant_isolation ON simulation.simulation_scenario_inputs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_scenario_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_scenario_assumptions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_scenario_assumptions_tenant_isolation ON simulation.simulation_scenario_assumptions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_scenario_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_scenario_constraints FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_scenario_constraints_tenant_isolation ON simulation.simulation_scenario_constraints USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_requests_tenant_isolation ON simulation.simulation_requests USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_runs_tenant_isolation ON simulation.simulation_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_run_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_run_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_run_status_history_tenant_isolation ON simulation.simulation_run_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_run_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_run_inputs FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_run_inputs_tenant_isolation ON simulation.simulation_run_inputs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_iterations FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_iterations_tenant_isolation ON simulation.simulation_iterations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_iteration_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_iteration_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_iteration_summaries_tenant_isolation ON simulation.simulation_iteration_summaries USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_distributions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_distributions_tenant_isolation ON simulation.simulation_distributions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_percentiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_percentiles FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_percentiles_tenant_isolation ON simulation.simulation_percentiles USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_results FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_results_tenant_isolation ON simulation.simulation_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_result_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_result_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_result_versions_tenant_isolation ON simulation.simulation_result_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_result_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_result_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_result_metrics_tenant_isolation ON simulation.simulation_result_metrics USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_result_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_result_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_result_evidence_tenant_isolation ON simulation.simulation_result_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_risk_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_risk_results FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_risk_results_tenant_isolation ON simulation.simulation_risk_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_sensitivity_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_sensitivity_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_sensitivity_runs_tenant_isolation ON simulation.simulation_sensitivity_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_sensitivity_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_sensitivity_results FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_sensitivity_results_tenant_isolation ON simulation.simulation_sensitivity_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_failure_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_failure_modes FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_failure_modes_tenant_isolation ON simulation.simulation_failure_modes USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.scenario_comparison_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.scenario_comparison_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY scenario_comparison_runs_tenant_isolation ON simulation.scenario_comparison_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.scenario_comparison_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.scenario_comparison_members FORCE ROW LEVEL SECURITY;
CREATE POLICY scenario_comparison_members_tenant_isolation ON simulation.scenario_comparison_members USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.scenario_comparison_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.scenario_comparison_results FORCE ROW LEVEL SECURITY;
CREATE POLICY scenario_comparison_results_tenant_isolation ON simulation.scenario_comparison_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_validation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_validation_runs_tenant_isolation ON simulation.simulation_validation_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_validation_results FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_validation_results_tenant_isolation ON simulation.simulation_validation_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_calibration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_calibration_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_calibration_runs_tenant_isolation ON simulation.simulation_calibration_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_calibration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_calibration_results FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_calibration_results_tenant_isolation ON simulation.simulation_calibration_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_insight_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_insight_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_insight_packages_tenant_isolation ON simulation.simulation_insight_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_insight_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_insight_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_insight_package_versions_tenant_isolation ON simulation.simulation_insight_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_publication_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_publication_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_publication_packages_tenant_isolation ON simulation.simulation_publication_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_publication_events FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_publication_events_tenant_isolation ON simulation.simulation_publication_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_component_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_component_registry_tenant_isolation ON simulation.simulation_component_registry USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_component_registry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_component_registry_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_component_registry_versions_tenant_isolation ON simulation.simulation_component_registry_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_deployments FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_deployments_tenant_isolation ON simulation.simulation_deployments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE simulation.simulation_deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation.simulation_deployment_rollbacks FORCE ROW LEVEL SECURITY;
CREATE POLICY simulation_deployment_rollbacks_tenant_isolation ON simulation.simulation_deployment_rollbacks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0075_create_sim_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
