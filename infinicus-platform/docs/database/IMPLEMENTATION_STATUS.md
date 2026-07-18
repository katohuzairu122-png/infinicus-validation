# Database Implementation Status

## Current stage

**Stage 2B — Data Acquisition Schema** — COMPLETE

---

## Completed work

### Stage 1 — Foundation (migration 0001)

| Table              | Purpose                                    |
|--------------------|--------------------------------------------|
| `_migrations`      | Migration registry (idempotent)            |
| `tenants`          | Multi-tenancy root (superseded by tenancy.tenants) |
| `workspaces`       | Logical grouping (superseded by tenancy.workspaces) |
| `users`            | Platform users (superseded by identity.users) |
| `workspace_members`| User ↔ workspace RBAC join                 |
| `businesses`       | Core business entity (superseded by platform.businesses) |
| `audit_log`        | Append-only mutation trail                 |
| `platform_events`  | Append-only PlatformEvent<T> store         |

### Stage 2A — Shared Persistence Foundation (migrations 0002–0012)

#### New PostgreSQL schemas

| Schema    | Tables | Purpose |
|-----------|--------|---------|
| `tenancy` | 8      | Canonical multi-tenant registry, RBAC |
| `identity`| 5      | Global user identity, sessions, API key refs |
| `platform`| 24     | Core business structures + canonical entities |
| `audit`   | 3      | Append-only audit trail and access events |
| `events`  | 5      | Transactional outbox/inbox event backbone |
| `files`   | 4      | Object storage metadata (no binary blobs) |

**Total Stage 2A tables: 49 across 6 schemas**

#### TypeScript helpers added

- `withTransaction()` — generic transactional client
- `withTenantTransaction()` — sets `app.tenant_id`, `app.workspace_id`, `app.user_id` before executing
- `getDatabasePool()` / `closeDatabasePool()` — API-name aliases
- `TenantContext` interface exported

#### Shared-types additions

- `TenantId`, `WorkspaceId`, `BusinessId`, `CorrelationId` — branded ID types

#### Seed files

- `infrastructure/database/seeds/0001_system_roles.sql` — system roles and sample permissions (dev only)

---

## Files changed (Stage 2A)

| File | Change |
|------|--------|
| `infrastructure/database/migrations/0002–0012.sql` | Created — 11 migration files |
| `infrastructure/database/seeds/0001_system_roles.sql` | Created — dev seed |
| `packages/database/src/client.ts` | Updated — `withTransaction`, `withTenantTransaction`, `TenantContext` |
| `packages/database/src/index.ts` | Updated — exports all new helpers |
| `packages/database/README.md` | Created |
| `packages/database/tests/migration-stage2a.test.ts` | Created — structural tests for 0002–0012 |
| `packages/database/tests/transaction-helpers.test.ts` | Created — unit tests for tx helpers |
| `packages/shared-types/src/index.ts` | Updated — branded ID types |
| `docs/database-stage-2a.md` | Created |
| `docs/database-schema-map.md` | Created |
| `docs/tenant-isolation.md` | Created |
| `docs/database-backup-restore.md` | Created |
| `docs/database/IMPLEMENTATION_STATUS.md` | Updated (this file) |

---

## Migrations created

| File | Status |
|------|--------|
| `0001_foundation.sql` | Validated (structural tests pass) |
| `0002_create_extensions.sql` | Validated (structural tests pass) |
| `0003_create_tenancy_schema.sql` | Validated |
| `0004_create_identity_schema.sql` | Validated |
| `0005_create_platform_schema.sql` | Validated |
| `0006_create_audit_schema.sql` | Validated |
| `0007_create_events_schema.sql` | Validated |
| `0008_create_files_schema.sql` | Validated |
| `0009_create_canonical_entities.sql` | Validated |
| `0010_create_indexes.sql` | Validated |
| `0011_create_rls_policies.sql` | Validated |
| `0012_create_updated_at_triggers.sql` | Validated |

---

### Stage 2B — Data Acquisition Schema (migrations 0013–0022)

#### New PostgreSQL schema

| Schema | Tables | Purpose |
|--------|--------|---------|
| `data_acquisition` | 36 | Full DA pipeline: sources → collection → validation → quality → provenance → publication |

**Total Stage 2B tables: 36 in 1 schema**

#### Table groups

| Group | Tables |
|-------|--------|
| Sources & Connectors | `data_sources`, `connectors`, `credential_references`, `collection_schedules` |
| Collection | `collection_runs`, `webhook_receipts`, `file_intakes`, `api_collection_runs`, `database_collection_runs`, `manual_submissions`, `stream_events` |
| Schema Detection | `detected_schemas`, `detected_fields` |
| Validation | `validation_policies`, `validation_results`, `validation_issues` |
| Cleaning | `cleaning_runs`, `cleaning_actions` |
| Normalization | `normalization_runs`, `normalization_mappings` |
| Entity Resolution | `entity_resolution_results`, `entity_match_candidates` |
| Deduplication | `duplicate_groups`, `duplicate_group_members` |
| Classification | `data_classifications`, `sensitive_data_actions` |
| Quality & Reliability | `data_quality_scores`, `missing_data_actions`, `source_reliability_scores` |
| Provenance | `provenance_records`, `transformation_records` |
| Publication | `publication_packages`, `publication_deliveries` |
| Deployment | `layer_assemblies`, `layer_deployments`, `layer_rollbacks` |

#### TypeScript repositories added

- `DataSourceRepository`
- `ConnectorRepository`
- `CollectionRunRepository`
- `ValidationResultRepository`
- `DataQualityScoreRepository`
- `ProvenanceRepository`
- `PublicationPackageRepository`

#### Shared-types additions (Stage 2B)

- `DataSourceId`, `ConnectorId`, `CollectionRunId`, `PublicationPackageId` — branded IDs
- `CollectionState`, `DataSourceType`, `SensitivityLevel`, `PublicationStatus` — enums

#### Outbox event functions added

9 SQL functions in `data_acquisition` schema emit typed events to `events.outbox_events`:
`da.source.registered`, `da.connector.registered`, `da.collection.started`,
`da.collection.completed`, `da.collection.failed`, `da.validation.completed`,
`da.data.quarantined`, `da.data.quality_scored`, `da.data.published`

#### RLS coverage

27 tables have RLS enabled. 9 detail/deployment tables are protected via parent FK.

#### Test count

270 tests pass (146 Stage 2B structural tests, 114 Stage 2A, 6 migration-0001, 4 transaction helper unit tests).

---

## Files changed (Stage 2B)

| File | Change |
|------|--------|
| `infrastructure/database/migrations/0013–0022.sql` | Created — 10 migration files |
| `packages/database/src/repositories/da/*.ts` | Created — 7 repository classes + barrel index |
| `packages/database/src/index.ts` | Updated — exports DA repositories and types |
| `packages/shared-types/src/index.ts` | Updated — DA branded IDs and enum types |
| `packages/database/tests/migration-stage2b.test.ts` | Created — 146 structural tests |
| `docs/database-stage-2b-data-acquisition.md` | Created |
| `docs/data-acquisition-schema-map.md` | Created |
| `docs/data-acquisition-rls.md` | Created |
| `docs/data-acquisition-event-outbox.md` | Created |
| `docs/database/IMPLEMENTATION_STATUS.md` | Updated (this file) |

---

## Migrations created

| File | Status |
|------|--------|
| `0001_foundation.sql` | Validated |
| `0002_create_extensions.sql` | Validated |
| `0003_create_tenancy_schema.sql` | Validated |
| `0004_create_identity_schema.sql` | Validated |
| `0005_create_platform_schema.sql` | Validated |
| `0006_create_audit_schema.sql` | Validated |
| `0007_create_events_schema.sql` | Validated |
| `0008_create_files_schema.sql` | Validated |
| `0009_create_canonical_entities.sql` | Validated |
| `0010_create_indexes.sql` | Validated |
| `0011_create_rls_policies.sql` | Validated |
| `0012_create_updated_at_triggers.sql` | Validated |
| `0013_create_da_sources_connectors.sql` | Validated |
| `0014_create_da_collection_runs.sql` | Validated |
| `0015_create_da_schema_validation.sql` | Validated |
| `0016_create_da_cleaning_normalization.sql` | Validated |
| `0017_create_da_resolution_classification.sql` | Validated |
| `0018_create_da_quality_provenance.sql` | Validated |
| `0019_create_da_publication_deployment.sql` | Validated |
| `0020_create_da_indexes.sql` | Validated |
| `0021_create_da_rls_policies.sql` | Validated |
| `0022_create_da_triggers_events.sql` | Validated |

---

## Known blockers

- No live PostgreSQL instance in the current environment — migrations cannot be applied until one is provisioned (Neon project or local Docker PG).
- Structural tests pass without a live database. Integration/constraint tests require a live database.

---

## Exact next task

**Stage 2C — Business Operations schema**

Start only when instructed.
