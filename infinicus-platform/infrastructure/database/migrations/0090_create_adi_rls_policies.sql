-- Migration: 0090_create_adi_rls_policies
-- Stage 2G — AI Decision Intelligence: RLS enabled and forced on all 47 tables
-- Null-safe fail-closed predicate, matching the Stage 2D/2E/2F convention.

BEGIN;

ALTER TABLE ai_decision_intelligence.adi_intake_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_intake_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_intake_packages_tenant_isolation ON ai_decision_intelligence.adi_intake_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_intake_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_intake_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_intake_package_versions_tenant_isolation ON ai_decision_intelligence.adi_intake_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_intake_source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_intake_source_references FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_intake_source_references_tenant_isolation ON ai_decision_intelligence.adi_intake_source_references USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_intake_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_intake_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_intake_status_history_tenant_isolation ON ai_decision_intelligence.adi_intake_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_questions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_questions_tenant_isolation ON ai_decision_intelligence.decision_questions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_question_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_question_versions_tenant_isolation ON ai_decision_intelligence.decision_question_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_objectives FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_objectives_tenant_isolation ON ai_decision_intelligence.decision_objectives USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_constraints FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_constraints_tenant_isolation ON ai_decision_intelligence.decision_constraints USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_cases FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_cases_tenant_isolation ON ai_decision_intelligence.decision_cases USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_case_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_case_versions_tenant_isolation ON ai_decision_intelligence.decision_case_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_case_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_case_status_history_tenant_isolation ON ai_decision_intelligence.decision_case_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_case_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_case_inputs FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_case_inputs_tenant_isolation ON ai_decision_intelligence.decision_case_inputs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.reasoning_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.reasoning_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY reasoning_requests_tenant_isolation ON ai_decision_intelligence.reasoning_requests USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.reasoning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.reasoning_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY reasoning_runs_tenant_isolation ON ai_decision_intelligence.reasoning_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.reasoning_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.reasoning_run_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY reasoning_run_steps_tenant_isolation ON ai_decision_intelligence.reasoning_run_steps USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.reasoning_run_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.reasoning_run_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY reasoning_run_status_history_tenant_isolation ON ai_decision_intelligence.reasoning_run_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_evidence_tenant_isolation ON ai_decision_intelligence.decision_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_evidence_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_evidence_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_evidence_versions_tenant_isolation ON ai_decision_intelligence.decision_evidence_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_evidence_links FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_evidence_links_tenant_isolation ON ai_decision_intelligence.decision_evidence_links USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_evidence_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_evidence_quality FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_evidence_quality_tenant_isolation ON ai_decision_intelligence.decision_evidence_quality USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_alternatives FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_alternatives_tenant_isolation ON ai_decision_intelligence.decision_alternatives USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_alternative_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_alternative_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_alternative_versions_tenant_isolation ON ai_decision_intelligence.decision_alternative_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.alternative_outcome_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.alternative_outcome_estimates FORCE ROW LEVEL SECURITY;
CREATE POLICY alternative_outcome_estimates_tenant_isolation ON ai_decision_intelligence.alternative_outcome_estimates USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.alternative_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.alternative_risk_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY alternative_risk_profiles_tenant_isolation ON ai_decision_intelligence.alternative_risk_profiles USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_recommendations FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_recommendations_tenant_isolation ON ai_decision_intelligence.decision_recommendations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_recommendation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_recommendation_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_recommendation_versions_tenant_isolation ON ai_decision_intelligence.decision_recommendation_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.recommendation_rationales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.recommendation_rationales FORCE ROW LEVEL SECURITY;
CREATE POLICY recommendation_rationales_tenant_isolation ON ai_decision_intelligence.recommendation_rationales USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.recommendation_implementation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.recommendation_implementation_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY recommendation_implementation_steps_tenant_isolation ON ai_decision_intelligence.recommendation_implementation_steps USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_confidence_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_confidence_scores_tenant_isolation ON ai_decision_intelligence.decision_confidence_scores USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_uncertainties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_uncertainties FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_uncertainties_tenant_isolation ON ai_decision_intelligence.decision_uncertainties USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_limitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_limitations FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_limitations_tenant_isolation ON ai_decision_intelligence.decision_limitations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_assumptions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_assumptions_tenant_isolation ON ai_decision_intelligence.decision_assumptions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_policies FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_policies_tenant_isolation ON ai_decision_intelligence.decision_policies USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_policy_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_policy_versions_tenant_isolation ON ai_decision_intelligence.decision_policy_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_policy_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_policy_evaluations FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_policy_evaluations_tenant_isolation ON ai_decision_intelligence.decision_policy_evaluations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_guardrail_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_guardrail_violations FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_guardrail_violations_tenant_isolation ON ai_decision_intelligence.decision_guardrail_violations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_monitoring_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_monitoring_requirements FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_monitoring_requirements_tenant_isolation ON ai_decision_intelligence.decision_monitoring_requirements USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_monitoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_monitoring_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_monitoring_metrics_tenant_isolation ON ai_decision_intelligence.decision_monitoring_metrics USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.decision_review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.decision_review_schedules FORCE ROW LEVEL SECURITY;
CREATE POLICY decision_review_schedules_tenant_isolation ON ai_decision_intelligence.decision_review_schedules USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_insight_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_insight_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_insight_packages_tenant_isolation ON ai_decision_intelligence.adi_insight_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_insight_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_insight_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_insight_package_versions_tenant_isolation ON ai_decision_intelligence.adi_insight_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_publication_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_publication_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_publication_packages_tenant_isolation ON ai_decision_intelligence.adi_publication_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_publication_events FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_publication_events_tenant_isolation ON ai_decision_intelligence.adi_publication_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_component_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_component_registry_tenant_isolation ON ai_decision_intelligence.adi_component_registry USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_component_registry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_component_registry_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_component_registry_versions_tenant_isolation ON ai_decision_intelligence.adi_component_registry_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_deployments FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_deployments_tenant_isolation ON ai_decision_intelligence.adi_deployments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE ai_decision_intelligence.adi_deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_intelligence.adi_deployment_rollbacks FORCE ROW LEVEL SECURITY;
CREATE POLICY adi_deployment_rollbacks_tenant_isolation ON ai_decision_intelligence.adi_deployment_rollbacks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0090_create_adi_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
