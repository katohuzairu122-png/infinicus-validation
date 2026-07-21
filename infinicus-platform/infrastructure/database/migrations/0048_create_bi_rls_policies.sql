-- Migration: 0048_create_bi_rls_policies
-- Stage 2D — Business Intelligence: Row Level Security, enabled AND forced
-- Pattern: tenant_id = app.tenant_id AND workspace_id = app.workspace_id (null-safe, fail-closed)
-- FORCE ROW LEVEL SECURITY strengthens the Stage 2A-2C convention: table owners
-- (including the admin/superuser test role) are also subject to RLS on these
-- tables unless they use BYPASSRLS, matching the append-only evidence guarantee.

BEGIN;

-- ── enable + force RLS on every BI table ────────────────────────────────────────

ALTER TABLE business_intelligence.analysis_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_inputs FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_outputs FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analysis_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analytical_dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analytical_dataset_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analytical_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.analytical_datasets FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_detections FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_rule_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.anomaly_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.benchmark_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.benchmark_datasets FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.benchmark_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.benchmark_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_component_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_component_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_component_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_component_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_deployment_rollbacks FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_deployments FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_publication_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_publication_events FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_publication_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.bi_publication_packages FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.comparison_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.comparison_results FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.comparison_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.comparison_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.dataset_data_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.dataset_data_references FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.dataset_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.dataset_lineage FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.finding_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.finding_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.finding_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.finding_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.findings FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_accuracy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_accuracy_records FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_models FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_points FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.forecast_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.insight_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.insight_package_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.insight_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.insight_packages FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_domain_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_domain_inputs FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_intake_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_intake_package_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_intake_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_intake_packages FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_processing_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_processing_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.intelligence_source_references FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_calculated_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_calculated_values FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_definition_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_definition_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_time_series_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.metric_time_series_values FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.risk_assessments FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.risk_factors FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.risk_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.risk_models FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.trend_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.trend_observations FORCE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence.trends FORCE ROW LEVEL SECURITY;

-- ── tenant + workspace isolation policies (null-safe, fail-closed) ─────────────

CREATE POLICY analysis_inputs_tenant_isolation ON business_intelligence.analysis_inputs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY analysis_outputs_tenant_isolation ON business_intelligence.analysis_outputs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY analysis_requests_tenant_isolation ON business_intelligence.analysis_requests
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY analysis_runs_tenant_isolation ON business_intelligence.analysis_runs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY analysis_status_history_tenant_isolation ON business_intelligence.analysis_status_history
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY analytical_dataset_versions_tenant_isolation ON business_intelligence.analytical_dataset_versions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY analytical_datasets_tenant_isolation ON business_intelligence.analytical_datasets
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY anomaly_detections_tenant_isolation ON business_intelligence.anomaly_detections
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY anomaly_evidence_tenant_isolation ON business_intelligence.anomaly_evidence
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY anomaly_rule_versions_tenant_isolation ON business_intelligence.anomaly_rule_versions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY anomaly_rules_tenant_isolation ON business_intelligence.anomaly_rules
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY anomaly_status_history_tenant_isolation ON business_intelligence.anomaly_status_history
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY benchmark_datasets_tenant_isolation ON business_intelligence.benchmark_datasets
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY benchmark_definitions_tenant_isolation ON business_intelligence.benchmark_definitions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bi_component_registry_tenant_isolation ON business_intelligence.bi_component_registry
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bi_component_versions_tenant_isolation ON business_intelligence.bi_component_versions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bi_deployment_rollbacks_tenant_isolation ON business_intelligence.bi_deployment_rollbacks
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bi_deployments_tenant_isolation ON business_intelligence.bi_deployments
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bi_publication_events_tenant_isolation ON business_intelligence.bi_publication_events
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY bi_publication_packages_tenant_isolation ON business_intelligence.bi_publication_packages
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY comparison_results_tenant_isolation ON business_intelligence.comparison_results
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY comparison_runs_tenant_isolation ON business_intelligence.comparison_runs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY dataset_data_references_tenant_isolation ON business_intelligence.dataset_data_references
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY dataset_lineage_tenant_isolation ON business_intelligence.dataset_lineage
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY finding_evidence_tenant_isolation ON business_intelligence.finding_evidence
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY finding_versions_tenant_isolation ON business_intelligence.finding_versions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY findings_tenant_isolation ON business_intelligence.findings
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY forecast_accuracy_records_tenant_isolation ON business_intelligence.forecast_accuracy_records
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY forecast_models_tenant_isolation ON business_intelligence.forecast_models
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY forecast_points_tenant_isolation ON business_intelligence.forecast_points
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY forecast_requests_tenant_isolation ON business_intelligence.forecast_requests
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY forecast_runs_tenant_isolation ON business_intelligence.forecast_runs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY insight_package_versions_tenant_isolation ON business_intelligence.insight_package_versions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY insight_packages_tenant_isolation ON business_intelligence.insight_packages
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY intelligence_domain_inputs_tenant_isolation ON business_intelligence.intelligence_domain_inputs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY intelligence_intake_package_versions_tenant_isolation ON business_intelligence.intelligence_intake_package_versions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY intelligence_intake_packages_tenant_isolation ON business_intelligence.intelligence_intake_packages
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY intelligence_processing_status_history_tenant_isolation ON business_intelligence.intelligence_processing_status_history
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY intelligence_source_references_tenant_isolation ON business_intelligence.intelligence_source_references
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY metric_calculated_values_tenant_isolation ON business_intelligence.metric_calculated_values
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY metric_definition_versions_tenant_isolation ON business_intelligence.metric_definition_versions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY metric_definitions_tenant_isolation ON business_intelligence.metric_definitions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY metric_time_series_values_tenant_isolation ON business_intelligence.metric_time_series_values
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY risk_assessments_tenant_isolation ON business_intelligence.risk_assessments
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY risk_factors_tenant_isolation ON business_intelligence.risk_factors
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY risk_models_tenant_isolation ON business_intelligence.risk_models
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY trend_observations_tenant_isolation ON business_intelligence.trend_observations
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

CREATE POLICY trends_tenant_isolation ON business_intelligence.trends
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

INSERT INTO _migrations (filename) VALUES ('0048_create_bi_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;