-- Migration: 0135_create_cl_rls_policies
-- Stage 2J — Continuous Learning: RLS enabled and forced on all 47 tables
-- Null-safe fail-closed predicate, matching the Stage 2D/2E/2F/2G/2H/2I convention.

BEGIN;

ALTER TABLE continuous_learning.cl_intake_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_intake_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_intake_packages_tenant_isolation ON continuous_learning.cl_intake_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_intake_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_intake_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_intake_package_versions_tenant_isolation ON continuous_learning.cl_intake_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_intake_source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_intake_source_references FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_intake_source_references_tenant_isolation ON continuous_learning.cl_intake_source_references USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_intake_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_intake_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_intake_status_history_tenant_isolation ON continuous_learning.cl_intake_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_cases FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_cases_tenant_isolation ON continuous_learning.learning_cases USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_case_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_case_versions_tenant_isolation ON continuous_learning.learning_case_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_case_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_case_status_history_tenant_isolation ON continuous_learning.learning_case_status_history USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_case_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_case_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_case_evidence_tenant_isolation ON continuous_learning.learning_case_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_feedback_records FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_feedback_records_tenant_isolation ON continuous_learning.learning_feedback_records USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_feedback_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_feedback_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_feedback_versions_tenant_isolation ON continuous_learning.learning_feedback_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_feedback_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_feedback_links FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_feedback_links_tenant_isolation ON continuous_learning.learning_feedback_links USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_feedback_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_feedback_quality FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_feedback_quality_tenant_isolation ON continuous_learning.learning_feedback_quality USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learned_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learned_lessons FORCE ROW LEVEL SECURITY;
CREATE POLICY learned_lessons_tenant_isolation ON continuous_learning.learned_lessons USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learned_lesson_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learned_lesson_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY learned_lesson_versions_tenant_isolation ON continuous_learning.learned_lesson_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.lesson_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.lesson_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY lesson_evidence_tenant_isolation ON continuous_learning.lesson_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.lesson_applicability ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.lesson_applicability FORCE ROW LEVEL SECURITY;
CREATE POLICY lesson_applicability_tenant_isolation ON continuous_learning.lesson_applicability USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_patterns FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_patterns_tenant_isolation ON continuous_learning.learning_patterns USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_pattern_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_pattern_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_pattern_versions_tenant_isolation ON continuous_learning.learning_pattern_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.pattern_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.pattern_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY pattern_observations_tenant_isolation ON continuous_learning.pattern_observations USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.pattern_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.pattern_confidence_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY pattern_confidence_scores_tenant_isolation ON continuous_learning.pattern_confidence_scores USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.model_evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.model_evaluation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY model_evaluation_runs_tenant_isolation ON continuous_learning.model_evaluation_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.model_evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.model_evaluation_results FORCE ROW LEVEL SECURITY;
CREATE POLICY model_evaluation_results_tenant_isolation ON continuous_learning.model_evaluation_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.model_drift_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.model_drift_records FORCE ROW LEVEL SECURITY;
CREATE POLICY model_drift_records_tenant_isolation ON continuous_learning.model_drift_records USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.model_bias_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.model_bias_records FORCE ROW LEVEL SECURITY;
CREATE POLICY model_bias_records_tenant_isolation ON continuous_learning.model_bias_records USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.policy_evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.policy_evaluation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_evaluation_runs_tenant_isolation ON continuous_learning.policy_evaluation_runs USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.policy_evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.policy_evaluation_results FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_evaluation_results_tenant_isolation ON continuous_learning.policy_evaluation_results USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.policy_change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.policy_change_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_change_proposals_tenant_isolation ON continuous_learning.policy_change_proposals USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.policy_change_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.policy_change_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_change_evidence_tenant_isolation ON continuous_learning.policy_change_evidence USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.improvement_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.improvement_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY improvement_proposals_tenant_isolation ON continuous_learning.improvement_proposals USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.improvement_proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.improvement_proposal_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY improvement_proposal_versions_tenant_isolation ON continuous_learning.improvement_proposal_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.improvement_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.improvement_impacts FORCE ROW LEVEL SECURITY;
CREATE POLICY improvement_impacts_tenant_isolation ON continuous_learning.improvement_impacts USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.improvement_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.improvement_risks FORCE ROW LEVEL SECURITY;
CREATE POLICY improvement_risks_tenant_isolation ON continuous_learning.improvement_risks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_change_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_change_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_change_reviews_tenant_isolation ON continuous_learning.learning_change_reviews USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_change_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_change_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_change_decisions_tenant_isolation ON continuous_learning.learning_change_decisions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_change_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_change_releases FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_change_releases_tenant_isolation ON continuous_learning.learning_change_releases USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.learning_change_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.learning_change_rollbacks FORCE ROW LEVEL SECURITY;
CREATE POLICY learning_change_rollbacks_tenant_isolation ON continuous_learning.learning_change_rollbacks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.knowledge_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.knowledge_artifacts FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_artifacts_tenant_isolation ON continuous_learning.knowledge_artifacts USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.knowledge_artifact_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.knowledge_artifact_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_artifact_versions_tenant_isolation ON continuous_learning.knowledge_artifact_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.knowledge_relationships FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_relationships_tenant_isolation ON continuous_learning.knowledge_relationships USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.knowledge_supersessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.knowledge_supersessions FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_supersessions_tenant_isolation ON continuous_learning.knowledge_supersessions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_feedback_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_feedback_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_feedback_packages_tenant_isolation ON continuous_learning.cl_feedback_packages USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_feedback_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_feedback_package_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_feedback_package_versions_tenant_isolation ON continuous_learning.cl_feedback_package_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_feedback_events FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_feedback_events_tenant_isolation ON continuous_learning.cl_feedback_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_component_registry FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_component_registry_tenant_isolation ON continuous_learning.cl_component_registry USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_component_registry_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_component_registry_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_component_registry_versions_tenant_isolation ON continuous_learning.cl_component_registry_versions USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_deployments FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_deployments_tenant_isolation ON continuous_learning.cl_deployments USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

ALTER TABLE continuous_learning.cl_deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_learning.cl_deployment_rollbacks FORCE ROW LEVEL SECURITY;
CREATE POLICY cl_deployment_rollbacks_tenant_isolation ON continuous_learning.cl_deployment_rollbacks USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND workspace_id = current_setting('app.workspace_id', true)::uuid);

INSERT INTO _migrations (filename) VALUES ('0135_create_cl_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
