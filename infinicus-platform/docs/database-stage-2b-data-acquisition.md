# Database Stage 2B — Data Acquisition Schema

## Overview

Stage 2B creates the `data_acquisition` schema with 36 tables supporting DA-02 through DA-25. It extends Stage 2A's tenancy model with full Row-Level Security, outbox event functions, and seven TypeScript repository classes.

## Migration Sequence

| File | Contents |
|------|----------|
| `0013_create_da_sources_connectors.sql` | `data_sources`, `connectors`, `credential_references`, `collection_schedules` |
| `0014_create_da_collection_runs.sql` | `collection_runs`, `webhook_receipts`, `file_intakes`, `api_collection_runs`, `database_collection_runs`, `manual_submissions`, `stream_events` |
| `0015_create_da_schema_validation.sql` | `detected_schemas`, `detected_fields`, `validation_policies`, `validation_results`, `validation_issues` |
| `0016_create_da_cleaning_normalization.sql` | `cleaning_runs`, `cleaning_actions`, `normalization_runs`, `normalization_mappings` |
| `0017_create_da_resolution_classification.sql` | `entity_resolution_results`, `entity_match_candidates`, `duplicate_groups`, `duplicate_group_members`, `data_classifications`, `sensitive_data_actions` |
| `0018_create_da_quality_provenance.sql` | `data_quality_scores`, `missing_data_actions`, `source_reliability_scores`, `provenance_records`, `transformation_records` |
| `0019_create_da_publication_deployment.sql` | `publication_packages`, `publication_deliveries`, `layer_assemblies`, `layer_deployments`, `layer_rollbacks` |
| `0020_create_da_indexes.sql` | ~120 indexes across all DA tables |
| `0021_create_da_rls_policies.sql` | RLS on 27 tenant-scoped tables |
| `0022_create_da_triggers_events.sql` | 18 `updated_at` triggers + outbox event helper functions |

## Table-to-Block Mapping

| Block | Tables |
|-------|--------|
| DA-02 Sources | `data_sources` |
| DA-03 Connectors | `connectors` |
| DA-04 Credentials | `credential_references` |
| DA-05 Schedules | `collection_schedules` |
| DA-05–11 Collection | `collection_runs` |
| DA-06 Webhooks | `webhook_receipts` |
| DA-07 Files | `file_intakes` |
| DA-08 API Runs | `api_collection_runs` |
| DA-09 DB Runs | `database_collection_runs` |
| DA-10 Manual | `manual_submissions` |
| DA-11 Streaming | `stream_events` |
| DA-12 Schema Detection | `detected_schemas`, `detected_fields` |
| DA-13 Validation | `validation_policies`, `validation_results`, `validation_issues` |
| DA-14 Cleaning | `cleaning_runs`, `cleaning_actions` |
| DA-15 Normalization | `normalization_runs`, `normalization_mappings` |
| DA-16 Entity Resolution | `entity_resolution_results`, `entity_match_candidates` |
| DA-17 Deduplication | `duplicate_groups`, `duplicate_group_members` |
| DA-18 Classification | `data_classifications` |
| DA-19 Sensitive Data | `sensitive_data_actions` |
| DA-20 Quality | `data_quality_scores` |
| DA-21 Missing Data | `missing_data_actions` |
| DA-22 Reliability | `source_reliability_scores` |
| DA-23 Provenance | `provenance_records`, `transformation_records` |
| DA-24 Publication | `publication_packages`, `publication_deliveries` |
| DA-25 Deployment | `layer_assemblies`, `layer_deployments`, `layer_rollbacks` |

## Collection Lifecycle

```
data_sources
    └─► connectors ──► credential_references
    └─► collection_schedules
    └─► collection_runs (state: planned → collecting → collected → validated → published)
            ├─► webhook_receipts   (DA-06)
            ├─► file_intakes       (DA-07)
            ├─► api_collection_runs (DA-08)
            ├─► database_collection_runs (DA-09)
            ├─► manual_submissions (DA-10)
            └─► stream_events      (DA-11)
                    │
                    ▼
            detected_schemas ──► detected_fields
            validation_results ──► validation_issues
            cleaning_runs ──► cleaning_actions
            normalization_runs
            entity_resolution_results ──► entity_match_candidates
            duplicate_groups ──► duplicate_group_members
            data_classifications ──► sensitive_data_actions
            data_quality_scores
            missing_data_actions
            source_reliability_scores
            provenance_records ──► transformation_records
                    │
                    ▼
            publication_packages ──► publication_deliveries
            layer_assemblies ──► layer_deployments ──► layer_rollbacks
```

## Quarantine Behavior

Records are quarantined rather than deleted when integrity fails. The `collection_runs.state` includes `quarantined`; `stream_events.status` includes `quarantined`. The `da.data.quarantined` outbox event is emitted to notify downstream consumers. Quarantine reasons are stored in context but source payloads are preserved.

## Quality and Reliability Scoring

`data_quality_scores` captures six dimensions (completeness, validity, consistency, timeliness, uniqueness, conformity) plus a weighted `overall_score`. All are constrained `[0, 1]`. `source_reliability_scores` captures source-level periodic aggregates with the same 0–1 constraint on each dimension. Both are append-only records — historical scores must not be updated.

## Provenance Immutability

`provenance_records` and `transformation_records` have no `updated_at` trigger and no application UPDATE path. The application role should not be granted UPDATE on these tables. `lineage_depth` is computed at insert time from the parent's depth.

## Publication Handoff to BO and BI

`publication_packages.target_layer` accepts `business_operations` and `business_intelligence` (plus other downstream layers). Once status transitions to `published`, the `da.data.published` outbox event fires. Downstream layers consume from `publication_packages` via the events.outbox_events relay.

## Running Migrations

```bash
DATABASE_URL=postgresql://... node -e "require('./packages/database/dist/migrate.js').runMigrations()"
```

## Running Tests

```bash
pnpm --filter @infinicus/database test
```

## What Remains for Stage 2C

- Business Operations schema (`business_operations`)
- BO-specific tables: contracts, deliverables, SLA tracking, workflow tasks
- Integration of DA publication events into BO consumers
- Full block-level TypeScript service implementations for all 25 DA blocks
