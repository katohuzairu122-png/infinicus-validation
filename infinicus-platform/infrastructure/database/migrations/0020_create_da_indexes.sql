-- Migration: 0020_create_da_indexes
-- Stage 2B — Indexes across all data_acquisition tables
-- Prefix: idx_da_*

BEGIN;

-- ── data_sources ──────────────────────────────────────────────────────────────
CREATE INDEX idx_da_sources_tenant_ws       ON data_acquisition.data_sources (tenant_id, workspace_id);
CREATE INDEX idx_da_sources_tenant_status   ON data_acquisition.data_sources (tenant_id, workspace_id, status);
CREATE INDEX idx_da_sources_business        ON data_acquisition.data_sources (business_id) WHERE business_id IS NOT NULL;
CREATE INDEX idx_da_sources_type            ON data_acquisition.data_sources (tenant_id, source_type);
CREATE INDEX idx_da_sources_created        ON data_acquisition.data_sources (tenant_id, created_at DESC);
CREATE INDEX idx_da_sources_correlation    ON data_acquisition.data_sources (tenant_id, correlation_id);
CREATE INDEX idx_da_sources_active         ON data_acquisition.data_sources (tenant_id, workspace_id) WHERE deleted_at IS NULL AND status = 'active';

-- ── connectors ───────────────────────────────────────────────────────────────
CREATE INDEX idx_da_connectors_tenant_ws    ON data_acquisition.connectors (tenant_id, workspace_id);
CREATE INDEX idx_da_connectors_source       ON data_acquisition.connectors (data_source_id);
CREATE INDEX idx_da_connectors_status       ON data_acquisition.connectors (tenant_id, workspace_id, status);
CREATE INDEX idx_da_connectors_health       ON data_acquisition.connectors (tenant_id, health_status);
CREATE INDEX idx_da_connectors_active       ON data_acquisition.connectors (tenant_id, workspace_id) WHERE deleted_at IS NULL;

-- ── credential_references ─────────────────────────────────────────────────────
CREATE INDEX idx_da_cred_refs_tenant_ws     ON data_acquisition.credential_references (tenant_id, workspace_id);
CREATE INDEX idx_da_cred_refs_source        ON data_acquisition.credential_references (data_source_id) WHERE data_source_id IS NOT NULL;
CREATE INDEX idx_da_cred_refs_connector     ON data_acquisition.credential_references (connector_id) WHERE connector_id IS NOT NULL;
CREATE INDEX idx_da_cred_refs_status        ON data_acquisition.credential_references (tenant_id, status);
CREATE INDEX idx_da_cred_refs_expires       ON data_acquisition.credential_references (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_da_cred_refs_rotation_due  ON data_acquisition.credential_references (rotation_due_at) WHERE rotation_due_at IS NOT NULL;

-- ── collection_schedules ──────────────────────────────────────────────────────
CREATE INDEX idx_da_schedules_tenant_ws     ON data_acquisition.collection_schedules (tenant_id, workspace_id);
CREATE INDEX idx_da_schedules_source        ON data_acquisition.collection_schedules (data_source_id);
CREATE INDEX idx_da_schedules_next_run      ON data_acquisition.collection_schedules (next_run_at) WHERE is_enabled = true AND next_run_at IS NOT NULL;
CREATE INDEX idx_da_schedules_status        ON data_acquisition.collection_schedules (tenant_id, status);

-- ── collection_runs ───────────────────────────────────────────────────────────
CREATE INDEX idx_da_runs_tenant_ws          ON data_acquisition.collection_runs (tenant_id, workspace_id);
CREATE INDEX idx_da_runs_source             ON data_acquisition.collection_runs (tenant_id, data_source_id, created_at DESC);
CREATE INDEX idx_da_runs_state              ON data_acquisition.collection_runs (tenant_id, workspace_id, state);
CREATE INDEX idx_da_runs_correlation        ON data_acquisition.collection_runs (tenant_id, correlation_id);
CREATE INDEX idx_da_runs_schedule           ON data_acquisition.collection_runs (schedule_id) WHERE schedule_id IS NOT NULL;
CREATE INDEX idx_da_runs_connector          ON data_acquisition.collection_runs (connector_id) WHERE connector_id IS NOT NULL;
CREATE INDEX idx_da_runs_business           ON data_acquisition.collection_runs (business_id) WHERE business_id IS NOT NULL;
CREATE INDEX idx_da_runs_created            ON data_acquisition.collection_runs (tenant_id, created_at DESC);

-- ── webhook_receipts ──────────────────────────────────────────────────────────
CREATE INDEX idx_da_webhooks_tenant_ws      ON data_acquisition.webhook_receipts (tenant_id, workspace_id);
CREATE INDEX idx_da_webhooks_run            ON data_acquisition.webhook_receipts (collection_run_id);
CREATE INDEX idx_da_webhooks_source         ON data_acquisition.webhook_receipts (data_source_id);
CREATE INDEX idx_da_webhooks_received       ON data_acquisition.webhook_receipts (received_at DESC);
CREATE INDEX idx_da_webhooks_status         ON data_acquisition.webhook_receipts (tenant_id, status);
CREATE INDEX idx_da_webhooks_payload_hash   ON data_acquisition.webhook_receipts (payload_hash);

-- ── file_intakes ──────────────────────────────────────────────────────────────
CREATE INDEX idx_da_files_tenant_ws         ON data_acquisition.file_intakes (tenant_id, workspace_id);
CREATE INDEX idx_da_files_run               ON data_acquisition.file_intakes (collection_run_id);
CREATE INDEX idx_da_files_source            ON data_acquisition.file_intakes (data_source_id);
CREATE INDEX idx_da_files_status            ON data_acquisition.file_intakes (tenant_id, status);
CREATE INDEX idx_da_files_scan_status       ON data_acquisition.file_intakes (malware_scan_status) WHERE malware_scan_status = 'pending';
CREATE INDEX idx_da_files_created           ON data_acquisition.file_intakes (tenant_id, created_at DESC);

-- ── stream_events ─────────────────────────────────────────────────────────────
CREATE INDEX idx_da_stream_tenant_ws        ON data_acquisition.stream_events (tenant_id, workspace_id);
CREATE INDEX idx_da_stream_source           ON data_acquisition.stream_events (data_source_id);
CREATE INDEX idx_da_stream_run              ON data_acquisition.stream_events (collection_run_id) WHERE collection_run_id IS NOT NULL;
CREATE INDEX idx_da_stream_event_time       ON data_acquisition.stream_events (tenant_id, event_time DESC);
CREATE INDEX idx_da_stream_received_at      ON data_acquisition.stream_events (received_at DESC);
CREATE INDEX idx_da_stream_status           ON data_acquisition.stream_events (tenant_id, status);
CREATE INDEX idx_da_stream_payload_hash     ON data_acquisition.stream_events (payload_hash);

-- ── detected_schemas ──────────────────────────────────────────────────────────
CREATE INDEX idx_da_schemas_tenant_ws       ON data_acquisition.detected_schemas (tenant_id, workspace_id);
CREATE INDEX idx_da_schemas_source          ON data_acquisition.detected_schemas (data_source_id);
CREATE INDEX idx_da_schemas_run             ON data_acquisition.detected_schemas (collection_run_id) WHERE collection_run_id IS NOT NULL;
CREATE INDEX idx_da_schemas_status          ON data_acquisition.detected_schemas (tenant_id, status);
CREATE INDEX idx_da_schemas_correlation     ON data_acquisition.detected_schemas (tenant_id, correlation_id);

-- ── detected_fields ───────────────────────────────────────────────────────────
CREATE INDEX idx_da_fields_schema           ON data_acquisition.detected_fields (detected_schema_id);
CREATE INDEX idx_da_fields_tenant           ON data_acquisition.detected_fields (tenant_id);
CREATE INDEX idx_da_fields_path             ON data_acquisition.detected_fields (detected_schema_id, field_path);

-- ── validation_policies ───────────────────────────────────────────────────────
CREATE INDEX idx_da_vpolicies_tenant_ws     ON data_acquisition.validation_policies (tenant_id, workspace_id);
CREATE INDEX idx_da_vpolicies_active        ON data_acquisition.validation_policies (tenant_id, workspace_id) WHERE is_active = true;
CREATE INDEX idx_da_vpolicies_schema_ref    ON data_acquisition.validation_policies (schema_reference_id) WHERE schema_reference_id IS NOT NULL;

-- ── validation_results ────────────────────────────────────────────────────────
CREATE INDEX idx_da_vresults_tenant_ws      ON data_acquisition.validation_results (tenant_id, workspace_id);
CREATE INDEX idx_da_vresults_run            ON data_acquisition.validation_results (tenant_id, collection_run_id);
CREATE INDEX idx_da_vresults_policy         ON data_acquisition.validation_results (validation_policy_id) WHERE validation_policy_id IS NOT NULL;
CREATE INDEX idx_da_vresults_invalid        ON data_acquisition.validation_results (tenant_id, workspace_id) WHERE is_valid = false;
CREATE INDEX idx_da_vresults_correlation    ON data_acquisition.validation_results (tenant_id, correlation_id);
CREATE INDEX idx_da_vresults_created        ON data_acquisition.validation_results (tenant_id, created_at DESC);

-- ── validation_issues ─────────────────────────────────────────────────────────
CREATE INDEX idx_da_vissues_result          ON data_acquisition.validation_issues (validation_result_id);
CREATE INDEX idx_da_vissues_tenant          ON data_acquisition.validation_issues (tenant_id);
CREATE INDEX idx_da_vissues_severity        ON data_acquisition.validation_issues (tenant_id, severity);
CREATE INDEX idx_da_vissues_resolution      ON data_acquisition.validation_issues (tenant_id, resolution_status);
CREATE INDEX idx_da_vissues_open            ON data_acquisition.validation_issues (tenant_id) WHERE resolution_status = 'open';

-- ── cleaning_runs ─────────────────────────────────────────────────────────────
CREATE INDEX idx_da_cleaning_runs_tenant    ON data_acquisition.cleaning_runs (tenant_id, workspace_id);
CREATE INDEX idx_da_cleaning_runs_run       ON data_acquisition.cleaning_runs (collection_run_id);
CREATE INDEX idx_da_cleaning_runs_status    ON data_acquisition.cleaning_runs (tenant_id, status);
CREATE INDEX idx_da_cleaning_runs_correlation ON data_acquisition.cleaning_runs (tenant_id, correlation_id);

-- ── cleaning_actions ──────────────────────────────────────────────────────────
CREATE INDEX idx_da_cleaning_actions_run    ON data_acquisition.cleaning_actions (cleaning_run_id);
CREATE INDEX idx_da_cleaning_actions_tenant ON data_acquisition.cleaning_actions (tenant_id);
CREATE INDEX idx_da_cleaning_actions_field  ON data_acquisition.cleaning_actions (cleaning_run_id, field_path) WHERE field_path IS NOT NULL;

-- ── normalization_runs ────────────────────────────────────────────────────────
CREATE INDEX idx_da_norm_runs_tenant_ws     ON data_acquisition.normalization_runs (tenant_id, workspace_id);
CREATE INDEX idx_da_norm_runs_run           ON data_acquisition.normalization_runs (collection_run_id);
CREATE INDEX idx_da_norm_runs_status        ON data_acquisition.normalization_runs (tenant_id, status);
CREATE INDEX idx_da_norm_runs_correlation   ON data_acquisition.normalization_runs (tenant_id, correlation_id);

-- ── normalization_mappings ────────────────────────────────────────────────────
CREATE INDEX idx_da_norm_mappings_tenant_ws ON data_acquisition.normalization_mappings (tenant_id, workspace_id);
CREATE INDEX idx_da_norm_mappings_type      ON data_acquisition.normalization_mappings (tenant_id, mapping_type, status);

-- ── entity_resolution_results ─────────────────────────────────────────────────
CREATE INDEX idx_da_erresults_tenant_ws     ON data_acquisition.entity_resolution_results (tenant_id, workspace_id);
CREATE INDEX idx_da_erresults_run           ON data_acquisition.entity_resolution_results (tenant_id, collection_run_id);
CREATE INDEX idx_da_erresults_status        ON data_acquisition.entity_resolution_results (tenant_id, resolution_status);
CREATE INDEX idx_da_erresults_source_ref    ON data_acquisition.entity_resolution_results (tenant_id, source_record_reference);
CREATE INDEX idx_da_erresults_correlation   ON data_acquisition.entity_resolution_results (tenant_id, correlation_id);
CREATE INDEX idx_da_erresults_review_req    ON data_acquisition.entity_resolution_results (tenant_id) WHERE resolution_status = 'review_required';

-- ── entity_match_candidates ───────────────────────────────────────────────────
CREATE INDEX idx_da_emcandidates_result     ON data_acquisition.entity_match_candidates (entity_resolution_result_id);
CREATE INDEX idx_da_emcandidates_rank       ON data_acquisition.entity_match_candidates (entity_resolution_result_id, rank);

-- ── duplicate_groups ──────────────────────────────────────────────────────────
CREATE INDEX idx_da_dupgroups_tenant_ws     ON data_acquisition.duplicate_groups (tenant_id, workspace_id);
CREATE INDEX idx_da_dupgroups_status        ON data_acquisition.duplicate_groups (tenant_id, status);
CREATE INDEX idx_da_dupgroups_entity_type   ON data_acquisition.duplicate_groups (tenant_id, entity_type);
CREATE INDEX idx_da_dupgroups_run           ON data_acquisition.duplicate_groups (collection_run_id) WHERE collection_run_id IS NOT NULL;
CREATE INDEX idx_da_dupgroups_open          ON data_acquisition.duplicate_groups (tenant_id) WHERE status = 'open';

-- ── duplicate_group_members ───────────────────────────────────────────────────
CREATE INDEX idx_da_dupmembers_group        ON data_acquisition.duplicate_group_members (duplicate_group_id);
CREATE INDEX idx_da_dupmembers_source       ON data_acquisition.duplicate_group_members (source_id) WHERE source_id IS NOT NULL;

-- ── data_classifications ──────────────────────────────────────────────────────
CREATE INDEX idx_da_dc_tenant_ws            ON data_acquisition.data_classifications (tenant_id, workspace_id);
CREATE INDEX idx_da_dc_run                  ON data_acquisition.data_classifications (collection_run_id) WHERE collection_run_id IS NOT NULL;
CREATE INDEX idx_da_dc_sensitivity          ON data_acquisition.data_classifications (tenant_id, sensitivity_level);
CREATE INDEX idx_da_dc_review_status        ON data_acquisition.data_classifications (tenant_id, review_status);
CREATE INDEX idx_da_dc_correlation          ON data_acquisition.data_classifications (tenant_id, correlation_id);

-- ── sensitive_data_actions ────────────────────────────────────────────────────
CREATE INDEX idx_da_sda_tenant_ws           ON data_acquisition.sensitive_data_actions (tenant_id, workspace_id);
CREATE INDEX idx_da_sda_classification      ON data_acquisition.sensitive_data_actions (data_classification_id);
CREATE INDEX idx_da_sda_action_type         ON data_acquisition.sensitive_data_actions (tenant_id, action_type);
CREATE INDEX idx_da_sda_performed_at        ON data_acquisition.sensitive_data_actions (tenant_id, performed_at DESC);
CREATE INDEX idx_da_sda_correlation         ON data_acquisition.sensitive_data_actions (tenant_id, correlation_id);

-- ── data_quality_scores ───────────────────────────────────────────────────────
CREATE INDEX idx_da_dqs_tenant_ws           ON data_acquisition.data_quality_scores (tenant_id, workspace_id);
CREATE INDEX idx_da_dqs_source              ON data_acquisition.data_quality_scores (tenant_id, data_source_id, created_at DESC);
CREATE INDEX idx_da_dqs_run                 ON data_acquisition.data_quality_scores (collection_run_id) WHERE collection_run_id IS NOT NULL;
CREATE INDEX idx_da_dqs_overall_score       ON data_acquisition.data_quality_scores (tenant_id, overall_score);
CREATE INDEX idx_da_dqs_correlation         ON data_acquisition.data_quality_scores (tenant_id, correlation_id);
CREATE INDEX idx_da_dqs_scored_at           ON data_acquisition.data_quality_scores (tenant_id, scored_at DESC);

-- ── missing_data_actions ──────────────────────────────────────────────────────
CREATE INDEX idx_da_mda_tenant_ws           ON data_acquisition.missing_data_actions (tenant_id, workspace_id);
CREATE INDEX idx_da_mda_run                 ON data_acquisition.missing_data_actions (collection_run_id);
CREATE INDEX idx_da_mda_field_path          ON data_acquisition.missing_data_actions (tenant_id, field_path);
CREATE INDEX idx_da_mda_status              ON data_acquisition.missing_data_actions (tenant_id, status);
CREATE INDEX idx_da_mda_correlation         ON data_acquisition.missing_data_actions (tenant_id, correlation_id);

-- ── source_reliability_scores ─────────────────────────────────────────────────
CREATE INDEX idx_da_srs_tenant_ws           ON data_acquisition.source_reliability_scores (tenant_id, workspace_id);
CREATE INDEX idx_da_srs_source              ON data_acquisition.source_reliability_scores (tenant_id, data_source_id, scored_at DESC);
CREATE INDEX idx_da_srs_overall             ON data_acquisition.source_reliability_scores (tenant_id, overall_reliability);
CREATE INDEX idx_da_srs_period              ON data_acquisition.source_reliability_scores (data_source_id, period_start, period_end);
CREATE INDEX idx_da_srs_correlation         ON data_acquisition.source_reliability_scores (tenant_id, correlation_id);

-- ── provenance_records ────────────────────────────────────────────────────────
CREATE INDEX idx_da_prov_tenant_ws          ON data_acquisition.provenance_records (tenant_id, workspace_id);
CREATE INDEX idx_da_prov_source             ON data_acquisition.provenance_records (tenant_id, data_source_id, created_at DESC);
CREATE INDEX idx_da_prov_run                ON data_acquisition.provenance_records (collection_run_id) WHERE collection_run_id IS NOT NULL;
CREATE INDEX idx_da_prov_record_ref         ON data_acquisition.provenance_records (tenant_id, record_reference);
CREATE INDEX idx_da_prov_parent             ON data_acquisition.provenance_records (parent_provenance_id) WHERE parent_provenance_id IS NOT NULL;
CREATE INDEX idx_da_prov_correlation        ON data_acquisition.provenance_records (tenant_id, correlation_id);
CREATE INDEX idx_da_prov_depth              ON data_acquisition.provenance_records (tenant_id, lineage_depth);

-- ── transformation_records ────────────────────────────────────────────────────
CREATE INDEX idx_da_transforms_prov         ON data_acquisition.transformation_records (provenance_record_id);
CREATE INDEX idx_da_transforms_performed_at ON data_acquisition.transformation_records (performed_at DESC);

-- ── publication_packages ──────────────────────────────────────────────────────
CREATE INDEX idx_da_pubpkg_tenant_ws        ON data_acquisition.publication_packages (tenant_id, workspace_id);
CREATE INDEX idx_da_pubpkg_target_layer     ON data_acquisition.publication_packages (tenant_id, target_layer, status);
CREATE INDEX idx_da_pubpkg_target_block     ON data_acquisition.publication_packages (tenant_id, target_layer, target_block);
CREATE INDEX idx_da_pubpkg_status           ON data_acquisition.publication_packages (tenant_id, workspace_id, status);
CREATE INDEX idx_da_pubpkg_published_at     ON data_acquisition.publication_packages (tenant_id, published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_da_pubpkg_correlation      ON data_acquisition.publication_packages (tenant_id, correlation_id);
CREATE INDEX idx_da_pubpkg_schema_ref       ON data_acquisition.publication_packages (schema_reference_id) WHERE schema_reference_id IS NOT NULL;
CREATE INDEX idx_da_pubpkg_business         ON data_acquisition.publication_packages (business_id) WHERE business_id IS NOT NULL;

-- ── publication_deliveries ────────────────────────────────────────────────────
CREATE INDEX idx_da_pubdel_package          ON data_acquisition.publication_deliveries (publication_package_id);
CREATE INDEX idx_da_pubdel_status           ON data_acquisition.publication_deliveries (delivery_status);
CREATE INDEX idx_da_pubdel_pending          ON data_acquisition.publication_deliveries (last_attempt_at) WHERE delivery_status IN ('pending','in_progress');

-- ── layer_assemblies ──────────────────────────────────────────────────────────
CREATE INDEX idx_da_assemblies_env_state    ON data_acquisition.layer_assemblies (environment, state);
CREATE INDEX idx_da_assemblies_release      ON data_acquisition.layer_assemblies (release_version);

-- ── layer_deployments ─────────────────────────────────────────────────────────
CREATE INDEX idx_da_deployments_assembly    ON data_acquisition.layer_deployments (layer_assembly_id);
CREATE INDEX idx_da_deployments_env_state   ON data_acquisition.layer_deployments (environment, state);
CREATE INDEX idx_da_deployments_release     ON data_acquisition.layer_deployments (release_version, environment);
CREATE INDEX idx_da_deployments_deployed_at ON data_acquisition.layer_deployments (deployed_at DESC);

-- ── layer_rollbacks ───────────────────────────────────────────────────────────
CREATE INDEX idx_da_rollbacks_deployment    ON data_acquisition.layer_rollbacks (layer_deployment_id);
CREATE INDEX idx_da_rollbacks_state         ON data_acquisition.layer_rollbacks (state);

INSERT INTO _migrations (filename) VALUES ('0020_create_da_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
