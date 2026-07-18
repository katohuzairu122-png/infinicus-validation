import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function readMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

// ── 0013 — Sources, Connectors, Credential References, Schedules ─────────────

describe('0013_create_da_sources_connectors', () => {
  const sql = readMigration('0013_create_da_sources_connectors.sql');

  it('creates the data_acquisition schema', () => {
    expect(sql).toMatch(/CREATE SCHEMA IF NOT EXISTS data_acquisition/);
  });

  it('creates data_sources table', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.data_sources/);
  });

  it('data_sources has required columns', () => {
    expect(sql).toMatch(/source_code\s+citext/);
    expect(sql).toMatch(/source_type\s+text/);
    expect(sql).toMatch(/sensitivity_level\s+text/);
    expect(sql).toMatch(/configuration\s+jsonb/);
    expect(sql).toMatch(/correlation_id\s+uuid/);
    expect(sql).toMatch(/deleted_at\s+timestamptz/);
  });

  it('data_sources has source_type CHECK constraint', () => {
    expect(sql).toMatch(/data_sources_type_check/);
    expect(sql).toMatch(/'manual','file','document','api','database','webhook'/);
  });

  it('data_sources enforces unique source_code per tenant+workspace', () => {
    expect(sql).toMatch(/data_sources_code_unique/);
    expect(sql).toMatch(/UNIQUE \(tenant_id, workspace_id, source_code\)/);
  });

  it('creates connectors table with type check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.connectors/);
    expect(sql).toMatch(/connectors_type_check/);
    expect(sql).toMatch(/'rest_api','graphql','webhook','postgres','mysql','mssql'/);
  });

  it('connectors has health_status check', () => {
    expect(sql).toMatch(/connectors_health_check/);
    expect(sql).toMatch(/'unknown','healthy','degraded','unhealthy','offline'/);
  });

  it('creates credential_references with owner check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.credential_references/);
    expect(sql).toMatch(/credential_refs_owner_check/);
    expect(sql).toMatch(/data_source_id IS NOT NULL OR connector_id IS NOT NULL/);
  });

  it('credential_references does not store raw secrets (comment present)', () => {
    expect(sql).toMatch(/Raw credentials must NEVER appear|never a raw credential/i);
  });

  it('creates collection_schedules with conditional constraints', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.collection_schedules/);
    expect(sql).toMatch(/schedules_cron_requires_expr/);
    expect(sql).toMatch(/schedule_type <> 'cron' OR cron_expression IS NOT NULL/);
    expect(sql).toMatch(/schedules_interval_requires_seconds/);
    expect(sql).toMatch(/interval_seconds IS NOT NULL AND interval_seconds > 0/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0013_create_da_sources_connectors\.sql/s);
  });
});

// ── 0014 — Collection Runs ────────────────────────────────────────────────────

describe('0014_create_da_collection_runs', () => {
  const sql = readMigration('0014_create_da_collection_runs.sql');

  it('creates collection_runs table', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.collection_runs/);
  });

  it('collection_runs has state CHECK with 9 states', () => {
    expect(sql).toMatch(/collection_runs_state_check/);
    expect(sql).toMatch(/'planned','scheduled','collecting','collected'/);
    expect(sql).toMatch(/'validated','published','failed','quarantined','cancelled'/);
  });

  it('collection_runs enforces counts coherence', () => {
    expect(sql).toMatch(/collection_runs_counts_coherent/);
    expect(sql).toMatch(/records_accepted \+ records_rejected <= records_received/);
  });

  it('creates webhook_receipts with idempotency key', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.webhook_receipts/);
    expect(sql).toMatch(/webhook_receipts_idempotency/);
    expect(sql).toMatch(/UNIQUE \(data_source_id, idempotency_key\)/);
  });

  it('webhook_receipts prevents invalid signatures from being processed', () => {
    expect(sql).toMatch(/webhook_receipts_invalid_not_processed/);
    expect(sql).toMatch(/signature_status <> 'invalid' OR processed_at IS NULL/);
  });

  it('creates file_intakes without bytea columns', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.file_intakes/);
    expect(sql).not.toMatch(/bytea/);
  });

  it('file_intakes references files.file_objects', () => {
    expect(sql).toMatch(/REFERENCES files\.file_objects\(id\)/);
  });

  it('creates api_collection_runs with unique collection_run_id', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.api_collection_runs/);
    expect(sql).toMatch(/collection_run_id.*NOT NULL UNIQUE/s);
  });

  it('api_collection_runs does not store access tokens (comment)', () => {
    expect(sql).toMatch(/No access tokens stored|no access tokens/i);
  });

  it('creates database_collection_runs without passwords', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.database_collection_runs/);
    expect(sql).toMatch(/No raw database passwords|no raw.*passwords/i);
  });

  it('creates manual_submissions with no-self-parent constraint', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.manual_submissions/);
    expect(sql).toMatch(/manual_submissions_no_self_parent/);
    expect(sql).toMatch(/id <> parent_submission_id/);
  });

  it('creates stream_events with conditional unique index', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.stream_events/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX stream_events_ext_id_unique/);
    expect(sql).toMatch(/WHERE external_event_id IS NOT NULL/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0014_create_da_collection_runs\.sql/s);
  });
});

// ── 0015 — Schema Validation ──────────────────────────────────────────────────

describe('0015_create_da_schema_validation', () => {
  const sql = readMigration('0015_create_da_schema_validation.sql');

  it('creates detected_schemas with confidence check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.detected_schemas/);
    expect(sql).toMatch(/detected_schemas_confidence_check/);
    expect(sql).toMatch(/confidence >= 0 AND confidence <= 1/);
  });

  it('creates detected_fields with tenant_id for RLS', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.detected_fields/);
    expect(sql).toMatch(/tenant_id.*uuid.*NOT NULL REFERENCES tenancy\.tenants/s);
  });

  it('detected_fields has unique field_path per schema', () => {
    expect(sql).toMatch(/detected_fields_path_unique/);
    expect(sql).toMatch(/UNIQUE \(detected_schema_id, field_path\)/);
  });

  it('detected_fields enforces null_count <= observed_count', () => {
    expect(sql).toMatch(/detected_fields_null_lte_obs/);
    expect(sql).toMatch(/null_count <= observed_count/);
  });

  it('creates validation_policies with severity check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.validation_policies/);
    expect(sql).toMatch(/validation_policies_severity_check/);
    expect(sql).toMatch(/'info','warning','error','critical'/);
  });

  it('validation_policies has unique code per tenant+workspace', () => {
    expect(sql).toMatch(/validation_policies_code_unique/);
    expect(sql).toMatch(/UNIQUE \(tenant_id, workspace_id, code\)/);
  });

  it('creates validation_results with counts nonneg constraint', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.validation_results/);
    expect(sql).toMatch(/validation_results_counts_nonneg/);
    expect(sql).toMatch(/error_count >= 0 AND warning_count >= 0/);
  });

  it('creates validation_issues with tenant_id for RLS', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.validation_issues/);
    expect(sql).toMatch(/tenant_id.*uuid.*NOT NULL REFERENCES tenancy\.tenants/s);
  });

  it('validation_issues has severity and resolution checks', () => {
    expect(sql).toMatch(/validation_issues_severity_check/);
    expect(sql).toMatch(/validation_issues_resolution_check/);
    expect(sql).toMatch(/'open','resolved','accepted','ignored','superseded'/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0015_create_da_schema_validation\.sql/s);
  });
});

// ── 0016 — Cleaning and Normalization ─────────────────────────────────────────

describe('0016_create_da_cleaning_normalization', () => {
  const sql = readMigration('0016_create_da_cleaning_normalization.sql');

  it('creates cleaning_runs with status check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.cleaning_runs/);
    expect(sql).toMatch(/cleaning_runs_status_check/);
    expect(sql).toMatch(/'pending','running','completed','failed','cancelled'/);
  });

  it('cleaning_runs has records count coherence', () => {
    expect(sql).toMatch(/cleaning_runs_modified_lte_processed/);
    expect(sql).toMatch(/records_modified <= records_processed/);
  });

  it('creates cleaning_actions with tenant_id', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.cleaning_actions/);
    expect(sql).toMatch(/tenant_id.*NOT NULL REFERENCES tenancy\.tenants/);
  });

  it('cleaning_actions has before_value (evidence preservation)', () => {
    expect(sql).toMatch(/before_value\s+jsonb/);
  });

  it('cleaning_actions confidence check handles null', () => {
    expect(sql).toMatch(/cleaning_actions_confidence_check/);
    expect(sql).toMatch(/confidence IS NULL OR \(confidence >= 0 AND confidence <= 1\)/);
  });

  it('creates normalization_runs with counts coherence', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.normalization_runs/);
    expect(sql).toMatch(/normalization_runs_normalized_lte_processed/);
    expect(sql).toMatch(/records_normalized <= records_processed/);
  });

  it('creates normalization_mappings with type check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.normalization_mappings/);
    expect(sql).toMatch(/normalization_mappings_mapping_type_check/);
  });

  it('normalization_mappings has effective period order constraint', () => {
    expect(sql).toMatch(/normalization_mappings_effective_order/);
    expect(sql).toMatch(/effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0016_create_da_cleaning_normalization\.sql/s);
  });
});

// ── 0017 — Resolution and Classification ──────────────────────────────────────

describe('0017_create_da_resolution_classification', () => {
  const sql = readMigration('0017_create_da_resolution_classification.sql');

  it('creates entity_resolution_results with score check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.entity_resolution_results/);
    expect(sql).toMatch(/entity_resolution_score_check/);
    expect(sql).toMatch(/match_score >= 0 AND match_score <= 1/);
  });

  it('entity_resolution_results has resolution_status check', () => {
    expect(sql).toMatch(/entity_resolution_status_check/);
    expect(sql).toMatch(/'matched','possible_match','new_entity','rejected','review_required'/);
  });

  it('creates entity_match_candidates with rank >= 1', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.entity_match_candidates/);
    expect(sql).toMatch(/entity_match_rank_pos/);
    expect(sql).toMatch(/rank >= 1/);
  });

  it('creates duplicate_groups with type check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.duplicate_groups/);
    expect(sql).toMatch(/duplicate_groups_type_check/);
    expect(sql).toMatch(/'exact','fuzzy','source_duplicate','cross_source','suspected'/);
  });

  it('creates duplicate_group_members with unique record per group', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.duplicate_group_members/);
    expect(sql).toMatch(/duplicate_members_unique/);
    expect(sql).toMatch(/UNIQUE \(duplicate_group_id, record_reference\)/);
  });

  it('creates data_classifications with sensitivity check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.data_classifications/);
    expect(sql).toMatch(/data_classifications_sensitivity_check/);
    expect(sql).toMatch(/'public','internal','confidential','restricted','highly_restricted'/);
  });

  it('creates sensitive_data_actions with action type check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.sensitive_data_actions/);
    expect(sql).toMatch(/sensitive_data_action_type_check/);
    expect(sql).toMatch(/'masked','redacted','tokenized','encrypted','restricted'/);
  });

  it('sensitive_data_actions does not permit plaintext storage (comment)', () => {
    expect(sql).toMatch(/Do not store removed plaintext|no plaintext/i);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0017_create_da_resolution_classification\.sql/s);
  });
});

// ── 0018 — Quality and Provenance ─────────────────────────────────────────────

describe('0018_create_da_quality_provenance', () => {
  const sql = readMigration('0018_create_da_quality_provenance.sql');

  it('creates data_quality_scores with all dimension checks', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.data_quality_scores/);
    expect(sql).toMatch(/dqs_completeness_check/);
    expect(sql).toMatch(/dqs_validity_check/);
    expect(sql).toMatch(/dqs_consistency_check/);
    expect(sql).toMatch(/dqs_timeliness_check/);
    expect(sql).toMatch(/dqs_uniqueness_check/);
    expect(sql).toMatch(/dqs_conformity_check/);
    expect(sql).toMatch(/dqs_overall_check/);
  });

  it('all quality score dimensions constrained 0–1', () => {
    expect(sql).toMatch(/completeness\s+>= 0 AND completeness\s+<= 1/);
    expect(sql).toMatch(/overall_score >= 0 AND overall_score <= 1/);
  });

  it('creates missing_data_actions with action type check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.missing_data_actions/);
    expect(sql).toMatch(/missing_data_action_type_check/);
    expect(sql).toMatch(/'impute','defer','quarantine','reject','request_source','accept_missing'/);
  });

  it('missing_data_actions confidence is nullable with bounds check', () => {
    expect(sql).toMatch(/missing_data_confidence_check/);
    expect(sql).toMatch(/confidence IS NULL OR \(confidence >= 0 AND confidence <= 1\)/);
  });

  it('creates source_reliability_scores with all score checks', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.source_reliability_scores/);
    expect(sql).toMatch(/srs_quality_check/);
    expect(sql).toMatch(/srs_overall_check/);
    expect(sql).toMatch(/overall_reliability\s+>= 0 AND overall_reliability\s+<= 1/);
  });

  it('source_reliability_scores has period order constraint', () => {
    expect(sql).toMatch(/srs_period_order/);
    expect(sql).toMatch(/period_start < period_end/);
  });

  it('creates provenance_records with no-self-parent constraint', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.provenance_records/);
    expect(sql).toMatch(/provenance_records_no_self_parent/);
    expect(sql).toMatch(/id <> parent_provenance_id/);
  });

  it('provenance_records has lineage_depth >= 0', () => {
    expect(sql).toMatch(/provenance_records_depth_nonneg/);
    expect(sql).toMatch(/lineage_depth >= 0/);
  });

  it('creates transformation_records as append-only (no updated_at)', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.transformation_records/);
    expect(sql).not.toMatch(/transformation_records[^;]*updated_at/s);
  });

  it('transformation_records has performed_by_type check', () => {
    expect(sql).toMatch(/transformation_records_performed_by_type_check/);
    expect(sql).toMatch(/'user','service_account','system','pipeline'/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0018_create_da_quality_provenance\.sql/s);
  });
});

// ── 0019 — Publication and Deployment ─────────────────────────────────────────

describe('0019_create_da_publication_deployment', () => {
  const sql = readMigration('0019_create_da_publication_deployment.sql');

  it('creates publication_packages with target_layer check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.publication_packages/);
    expect(sql).toMatch(/publication_packages_target_layer_check/);
    expect(sql).toMatch(/'business_operations','business_intelligence'/);
  });

  it('publication_packages has status check', () => {
    expect(sql).toMatch(/publication_packages_status_check/);
    expect(sql).toMatch(/'draft','ready','published','blocked','failed','revoked'/);
  });

  it('publication_packages quality/reliability scores allow null with bounds', () => {
    expect(sql).toMatch(/publication_packages_quality_check/);
    expect(sql).toMatch(/quality_score IS NULL OR \(quality_score >= 0 AND quality_score <= 1\)/);
  });

  it('creates publication_deliveries with status check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.publication_deliveries/);
    expect(sql).toMatch(/publication_deliveries_status_check/);
    expect(sql).toMatch(/'pending','in_progress','delivered','failed','cancelled'/);
  });

  it('creates layer_assemblies with state and environment checks', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.layer_assemblies/);
    expect(sql).toMatch(/layer_assemblies_state_check/);
    expect(sql).toMatch(/layer_assemblies_environment_check/);
    expect(sql).toMatch(/'development','staging','production','test'/);
  });

  it('creates layer_deployments with rollback_reference FK', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.layer_deployments/);
    expect(sql).toMatch(/REFERENCES data_acquisition\.layer_deployments\(id\)/);
  });

  it('creates layer_rollbacks with state check', () => {
    expect(sql).toMatch(/CREATE TABLE data_acquisition\.layer_rollbacks/);
    expect(sql).toMatch(/layer_rollbacks_state_check/);
    expect(sql).toMatch(/'pending','rolling_back','completed','failed'/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0019_create_da_publication_deployment\.sql/s);
  });
});

// ── 0020 — Indexes ───────────────────────────────────────────────────────────

describe('0020_create_da_indexes', () => {
  const sql = readMigration('0020_create_da_indexes.sql');

  it('creates tenant+workspace composite indexes for major tables', () => {
    expect(sql).toMatch(/idx_da_sources_tenant_ws/);
    expect(sql).toMatch(/idx_da_runs_tenant_ws/);
    expect(sql).toMatch(/idx_da_pubpkg_tenant_ws/);
  });

  it('creates partial index for active data sources', () => {
    expect(sql).toMatch(/idx_da_sources_active/);
    expect(sql).toMatch(/WHERE deleted_at IS NULL AND status = 'active'/);
  });

  it('creates pending webhook index', () => {
    expect(sql).toMatch(/idx_da_webhooks_status/);
  });

  it('creates index on overall_score', () => {
    expect(sql).toMatch(/idx_da_dqs_overall_score/);
    expect(sql).toMatch(/overall_score/);
  });

  it('creates index on target_layer', () => {
    expect(sql).toMatch(/idx_da_pubpkg_target_layer/);
    expect(sql).toMatch(/target_layer/);
  });

  it('creates correlation_id indexes', () => {
    expect(sql).toMatch(/idx_da_runs_correlation/);
    expect(sql).toMatch(/correlation_id/);
  });

  it('creates stream event time index', () => {
    expect(sql).toMatch(/idx_da_stream_event_time/);
    expect(sql).toMatch(/event_time DESC/);
  });

  it('creates published_at index', () => {
    expect(sql).toMatch(/idx_da_pubpkg_published_at/);
    expect(sql).toMatch(/published_at DESC/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0020_create_da_indexes\.sql/s);
  });
});

// ── 0021 — RLS Policies ───────────────────────────────────────────────────────

describe('0021_create_da_rls_policies', () => {
  const sql = readMigration('0021_create_da_rls_policies.sql');

  const tenantedTables = [
    'data_sources', 'connectors', 'credential_references', 'collection_schedules',
    'collection_runs', 'webhook_receipts', 'file_intakes', 'manual_submissions',
    'stream_events', 'detected_schemas', 'detected_fields', 'validation_policies',
    'validation_results', 'validation_issues', 'cleaning_runs', 'cleaning_actions',
    'normalization_runs', 'normalization_mappings', 'entity_resolution_results',
    'duplicate_groups', 'data_classifications', 'sensitive_data_actions',
    'data_quality_scores', 'missing_data_actions', 'source_reliability_scores',
    'provenance_records', 'publication_packages',
  ];

  it.each(tenantedTables)('enables RLS on %s', (table) => {
    expect(sql).toMatch(new RegExp(`ALTER TABLE data_acquisition\\.${table} ENABLE ROW LEVEL SECURITY`));
  });

  it('uses app.tenant_id transaction-local setting', () => {
    expect(sql).toMatch(/current_setting\('app\.tenant_id',\s*true\)::uuid/);
  });

  it('uses app.workspace_id for workspace-scoped tables', () => {
    expect(sql).toMatch(/current_setting\('app\.workspace_id',\s*true\)::uuid/);
  });

  it('does not use broad USING (true) policies', () => {
    expect(sql).not.toMatch(/USING \(true\)/);
  });

  it('cross-tenant deployment tables have no RLS (documented)', () => {
    expect(sql).toMatch(/layer_assemblies.*cross-tenant|cross-tenant.*layer_assemblies/i);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0021_create_da_rls_policies\.sql/s);
  });
});

// ── 0022 — Triggers and Events ────────────────────────────────────────────────

describe('0022_create_da_triggers_events', () => {
  const sql = readMigration('0022_create_da_triggers_events.sql');

  const triggeredTables = [
    'data_sources', 'connectors', 'credential_references', 'collection_schedules',
    'collection_runs', 'file_intakes', 'api_collection_runs', 'database_collection_runs',
    'manual_submissions', 'detected_schemas', 'validation_policies',
    'normalization_mappings', 'entity_resolution_results', 'duplicate_groups',
    'data_classifications', 'missing_data_actions', 'publication_packages',
    'publication_deliveries',
  ];

  it.each(triggeredTables)('creates updated_at trigger on %s', (table) => {
    expect(sql).toMatch(new RegExp(`CREATE TRIGGER set_updated_at_${table.replace(/_/g, '_')}`));
  });

  it('does not apply trigger to webhook_receipts (append-only)', () => {
    expect(sql).not.toMatch(/CREATE TRIGGER set_updated_at_webhook_receipts/);
  });

  it('does not apply trigger to provenance_records (immutable)', () => {
    expect(sql).not.toMatch(/CREATE TRIGGER set_updated_at_provenance_records/);
  });

  it('does not apply trigger to stream_events (append-only)', () => {
    expect(sql).not.toMatch(/CREATE TRIGGER set_updated_at_stream_events/);
  });

  it('creates emit_outbox_event helper function', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION data_acquisition\.emit_outbox_event/);
    expect(sql).toMatch(/INSERT INTO events\.outbox_events/);
  });

  it('creates all 9 required event wrapper functions', () => {
    expect(sql).toMatch(/emit_source_registered/);
    expect(sql).toMatch(/emit_connector_registered/);
    expect(sql).toMatch(/emit_collection_started/);
    expect(sql).toMatch(/emit_collection_completed/);
    expect(sql).toMatch(/emit_collection_failed/);
    expect(sql).toMatch(/emit_validation_completed/);
    expect(sql).toMatch(/emit_data_quarantined/);
    expect(sql).toMatch(/emit_data_quality_scored/);
    expect(sql).toMatch(/emit_data_published/);
  });

  it('outbox events use correct event type strings', () => {
    expect(sql).toMatch(/'da\.source\.registered'/);
    expect(sql).toMatch(/'da\.connector\.registered'/);
    expect(sql).toMatch(/'da\.collection\.started'/);
    expect(sql).toMatch(/'da\.collection\.completed'/);
    expect(sql).toMatch(/'da\.collection\.failed'/);
    expect(sql).toMatch(/'da\.validation\.completed'/);
    expect(sql).toMatch(/'da\.data\.quarantined'/);
    expect(sql).toMatch(/'da\.data\.quality_scored'/);
    expect(sql).toMatch(/'da\.data\.published'/);
  });

  it('outbox events use SECURITY DEFINER (controlled privilege)', () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
  });

  it('records the migration in _migrations', () => {
    expect(sql).toMatch(/INSERT INTO _migrations.*0022_create_da_triggers_events\.sql/s);
  });
});

// ── Repository type-checking tests ────────────────────────────────────────────

describe('DA Repository exports', () => {
  it('DataSourceRepository is importable', async () => {
    const mod = await import('../src/repositories/da/DataSourceRepository.js');
    expect(mod.DataSourceRepository).toBeDefined();
    expect(mod.NotFoundError).toBeDefined();
    const repo = new mod.DataSourceRepository();
    expect(repo).toBeDefined();
  });

  it('ConnectorRepository is importable', async () => {
    const mod = await import('../src/repositories/da/ConnectorRepository.js');
    expect(mod.ConnectorRepository).toBeDefined();
  });

  it('CollectionRunRepository is importable', async () => {
    const mod = await import('../src/repositories/da/CollectionRunRepository.js');
    expect(mod.CollectionRunRepository).toBeDefined();
  });

  it('ValidationResultRepository is importable', async () => {
    const mod = await import('../src/repositories/da/ValidationResultRepository.js');
    expect(mod.ValidationResultRepository).toBeDefined();
  });

  it('DataQualityScoreRepository is importable', async () => {
    const mod = await import('../src/repositories/da/DataQualityScoreRepository.js');
    expect(mod.DataQualityScoreRepository).toBeDefined();
  });

  it('ProvenanceRepository is importable', async () => {
    const mod = await import('../src/repositories/da/ProvenanceRepository.js');
    expect(mod.ProvenanceRepository).toBeDefined();
  });

  it('PublicationPackageRepository is importable', async () => {
    const mod = await import('../src/repositories/da/PublicationPackageRepository.js');
    expect(mod.PublicationPackageRepository).toBeDefined();
  });

  it('NotFoundError has correct name', async () => {
    const { NotFoundError } = await import('../src/repositories/da/DataSourceRepository.js');
    const err = new NotFoundError('DataSource', 'test-id');
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toContain('DataSource');
    expect(err.message).toContain('test-id');
    expect(err instanceof Error).toBe(true);
  });
});
