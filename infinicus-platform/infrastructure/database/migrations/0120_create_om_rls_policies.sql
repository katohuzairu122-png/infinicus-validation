-- Migration: 0120_create_om_rls_policies
-- Stage 2I — Outcome Monitoring: RLS enabled and forced on all 45 tables
-- Null-safe fail-closed predicate, matching the Stage 2D/2E/2F/2G/2H convention.

BEGIN;

ALTER TABLE outcome_monitoring.om_intake_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_intake_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY om_intake_packages_tenant_isolation ON outcome_monitoring.om_intake_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_intake_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_intake_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY om_intake_package_versions_tenant_isolation ON outcome_monitoring.om_intake_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_intake_source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_intake_source_references FORCE ROW LEVEL SECURITY;
CREATE POLICY om_intake_source_references_tenant_isolation ON outcome_monitoring.om_intake_source_references USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_intake_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_intake_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY om_intake_status_history_tenant_isolation ON outcome_monitoring.om_intake_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_plans_tenant_isolation ON outcome_monitoring.monitoring_plans USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_plan_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_plan_versions_tenant_isolation ON outcome_monitoring.monitoring_plan_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_plan_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_plan_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_plan_metrics_tenant_isolation ON outcome_monitoring.monitoring_plan_metrics USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_plan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_plan_schedules FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_plan_schedules_tenant_isolation ON outcome_monitoring.monitoring_plan_schedules USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitored_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitored_actions FORCE ROW LEVEL SECURITY;
CREATE POLICY monitored_actions_tenant_isolation ON outcome_monitoring.monitored_actions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitored_action_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitored_action_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY monitored_action_versions_tenant_isolation ON outcome_monitoring.monitored_action_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitored_action_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitored_action_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY monitored_action_status_history_tenant_isolation ON outcome_monitoring.monitored_action_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.action_execution_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.action_execution_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY action_execution_observations_tenant_isolation ON outcome_monitoring.action_execution_observations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_observations_tenant_isolation ON outcome_monitoring.outcome_observations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_observation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_observation_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_observation_versions_tenant_isolation ON outcome_monitoring.outcome_observation_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_measurements FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_measurements_tenant_isolation ON outcome_monitoring.outcome_measurements USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_evidence_tenant_isolation ON outcome_monitoring.outcome_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_targets FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_targets_tenant_isolation ON outcome_monitoring.outcome_targets USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_target_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_target_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_target_versions_tenant_isolation ON outcome_monitoring.outcome_target_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_thresholds FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_thresholds_tenant_isolation ON outcome_monitoring.outcome_thresholds USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.threshold_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.threshold_breaches FORCE ROW LEVEL SECURITY;
CREATE POLICY threshold_breaches_tenant_isolation ON outcome_monitoring.threshold_breaches USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_variance_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_variance_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_variance_runs_tenant_isolation ON outcome_monitoring.outcome_variance_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_variance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_variance_results FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_variance_results_tenant_isolation ON outcome_monitoring.outcome_variance_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.expected_actual_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.expected_actual_comparisons FORCE ROW LEVEL SECURITY;
CREATE POLICY expected_actual_comparisons_tenant_isolation ON outcome_monitoring.expected_actual_comparisons USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.variance_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.variance_explanations FORCE ROW LEVEL SECURITY;
CREATE POLICY variance_explanations_tenant_isolation ON outcome_monitoring.variance_explanations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_alert_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_alert_rules_tenant_isolation ON outcome_monitoring.monitoring_alert_rules USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_alert_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_alert_rule_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_alert_rule_versions_tenant_isolation ON outcome_monitoring.monitoring_alert_rule_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_alerts FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_alerts_tenant_isolation ON outcome_monitoring.monitoring_alerts USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.monitoring_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.monitoring_incidents FORCE ROW LEVEL SECURITY;
CREATE POLICY monitoring_incidents_tenant_isolation ON outcome_monitoring.monitoring_incidents USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_attribution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_attribution_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_attribution_runs_tenant_isolation ON outcome_monitoring.outcome_attribution_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_attribution_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_attribution_factors FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_attribution_factors_tenant_isolation ON outcome_monitoring.outcome_attribution_factors USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_attribution_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_attribution_results FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_attribution_results_tenant_isolation ON outcome_monitoring.outcome_attribution_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_reviews_tenant_isolation ON outcome_monitoring.outcome_reviews USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_review_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_review_findings FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_review_findings_tenant_isolation ON outcome_monitoring.outcome_review_findings USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_review_actions FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_review_actions_tenant_isolation ON outcome_monitoring.outcome_review_actions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.outcome_review_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.outcome_review_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY outcome_review_status_history_tenant_isolation ON outcome_monitoring.outcome_review_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.learning_feedback_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.learning_feedback_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_feedback_packages_tenant_isolation ON outcome_monitoring.learning_feedback_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.learning_feedback_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.learning_feedback_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_feedback_package_versions_tenant_isolation ON outcome_monitoring.learning_feedback_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.learning_feedback_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.learning_feedback_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_feedback_evidence_tenant_isolation ON outcome_monitoring.learning_feedback_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_publication_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_publication_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY om_publication_packages_tenant_isolation ON outcome_monitoring.om_publication_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_publication_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_publication_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY om_publication_package_versions_tenant_isolation ON outcome_monitoring.om_publication_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_publication_events FORCE ROW LEVEL SECURITY;
CREATE POLICY om_publication_events_tenant_isolation ON outcome_monitoring.om_publication_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_component_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY om_component_registry_tenant_isolation ON outcome_monitoring.om_component_registry USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_component_registry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_component_registry_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY om_component_registry_versions_tenant_isolation ON outcome_monitoring.om_component_registry_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_deployments FORCE ROW LEVEL SECURITY;
CREATE POLICY om_deployments_tenant_isolation ON outcome_monitoring.om_deployments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE outcome_monitoring.om_deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_monitoring.om_deployment_rollbacks FORCE ROW LEVEL SECURITY;
CREATE POLICY om_deployment_rollbacks_tenant_isolation ON outcome_monitoring.om_deployment_rollbacks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0120_create_om_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
