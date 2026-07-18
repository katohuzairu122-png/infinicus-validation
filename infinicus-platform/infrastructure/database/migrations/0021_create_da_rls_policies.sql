-- Migration: 0021_create_da_rls_policies
-- Stage 2B — Row-Level Security for all tenant-owned data_acquisition tables
-- Pattern mirrors Stage 2A: transaction-local settings app.tenant_id / app.workspace_id

BEGIN;

-- ── data_sources ──────────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_sources_isolation ON data_acquisition.data_sources
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── connectors ───────────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY connectors_isolation ON data_acquisition.connectors
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── credential_references ─────────────────────────────────────────────────────
ALTER TABLE data_acquisition.credential_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY credential_references_isolation ON data_acquisition.credential_references
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── collection_schedules ──────────────────────────────────────────────────────
ALTER TABLE data_acquisition.collection_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY collection_schedules_isolation ON data_acquisition.collection_schedules
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── collection_runs ───────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.collection_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY collection_runs_isolation ON data_acquisition.collection_runs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── webhook_receipts ──────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.webhook_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_receipts_isolation ON data_acquisition.webhook_receipts
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── file_intakes ──────────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.file_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY file_intakes_isolation ON data_acquisition.file_intakes
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── manual_submissions ────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.manual_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY manual_submissions_isolation ON data_acquisition.manual_submissions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── stream_events ─────────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.stream_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY stream_events_isolation ON data_acquisition.stream_events
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── detected_schemas ──────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.detected_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY detected_schemas_isolation ON data_acquisition.detected_schemas
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── detected_fields ───────────────────────────────────────────────────────────
-- Has explicit tenant_id for direct RLS (added in 0015).
ALTER TABLE data_acquisition.detected_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY detected_fields_isolation ON data_acquisition.detected_fields
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- ── validation_policies ───────────────────────────────────────────────────────
ALTER TABLE data_acquisition.validation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY validation_policies_isolation ON data_acquisition.validation_policies
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── validation_results ────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY validation_results_isolation ON data_acquisition.validation_results
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── validation_issues ─────────────────────────────────────────────────────────
-- Has explicit tenant_id for direct RLS (added in 0015).
ALTER TABLE data_acquisition.validation_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY validation_issues_isolation ON data_acquisition.validation_issues
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- ── cleaning_runs ─────────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.cleaning_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cleaning_runs_isolation ON data_acquisition.cleaning_runs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── cleaning_actions ──────────────────────────────────────────────────────────
-- Has explicit tenant_id for direct RLS (added in 0016).
ALTER TABLE data_acquisition.cleaning_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cleaning_actions_isolation ON data_acquisition.cleaning_actions
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- ── normalization_runs ────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.normalization_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY normalization_runs_isolation ON data_acquisition.normalization_runs
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── normalization_mappings ────────────────────────────────────────────────────
ALTER TABLE data_acquisition.normalization_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY normalization_mappings_isolation ON data_acquisition.normalization_mappings
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── entity_resolution_results ─────────────────────────────────────────────────
ALTER TABLE data_acquisition.entity_resolution_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_resolution_results_isolation ON data_acquisition.entity_resolution_results
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── duplicate_groups ──────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.duplicate_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY duplicate_groups_isolation ON data_acquisition.duplicate_groups
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── data_classifications ──────────────────────────────────────────────────────
ALTER TABLE data_acquisition.data_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_classifications_isolation ON data_acquisition.data_classifications
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── sensitive_data_actions ────────────────────────────────────────────────────
ALTER TABLE data_acquisition.sensitive_data_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sensitive_data_actions_isolation ON data_acquisition.sensitive_data_actions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── data_quality_scores ───────────────────────────────────────────────────────
ALTER TABLE data_acquisition.data_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_quality_scores_isolation ON data_acquisition.data_quality_scores
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── missing_data_actions ──────────────────────────────────────────────────────
ALTER TABLE data_acquisition.missing_data_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY missing_data_actions_isolation ON data_acquisition.missing_data_actions
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── source_reliability_scores ─────────────────────────────────────────────────
ALTER TABLE data_acquisition.source_reliability_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY source_reliability_scores_isolation ON data_acquisition.source_reliability_scores
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── provenance_records ────────────────────────────────────────────────────────
ALTER TABLE data_acquisition.provenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY provenance_records_isolation ON data_acquisition.provenance_records
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── publication_packages ──────────────────────────────────────────────────────
ALTER TABLE data_acquisition.publication_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY publication_packages_isolation ON data_acquisition.publication_packages
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );

-- ── Non-tenant tables (no RLS): ───────────────────────────────────────────────
-- api_collection_runs   — detail attached to collection_runs (already RLS-protected)
-- database_collection_runs — same
-- entity_match_candidates — attached to entity_resolution_results (already RLS-protected)
-- duplicate_group_members — attached to duplicate_groups (already RLS-protected)
-- transformation_records — attached to provenance_records (already RLS-protected)
-- publication_deliveries — attached to publication_packages (already RLS-protected)
-- layer_assemblies       — cross-tenant deployment metadata; not tenant-scoped
-- layer_deployments      — cross-tenant deployment metadata; not tenant-scoped
-- layer_rollbacks        — cross-tenant deployment metadata; not tenant-scoped

INSERT INTO _migrations (filename) VALUES ('0021_create_da_rls_policies.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
