# Database Implementation Status

## Current stage

**Stage 2D — Business Intelligence Schema** — COMPLETE — FROZEN

Frozen migration range: **0001–0049**

---

### Stage 2D — Business Intelligence Schema (migrations 0037–0049)

#### New PostgreSQL schema

| Schema | Tables | Purpose |
|--------|--------|---------|
| `business_intelligence` | 48 | Intake/lineage, analytical datasets, metrics/KPIs, analysis lifecycle, findings, trends, forecasts, anomalies, benchmarks, risk intelligence, publication, component registry/deployment |

**Total Stage 2D tables: 48 in 1 schema** (canonical tenant/workspace/business/user identity reused from Stage 2A; BO publication packages reused from Stage 2C — no duplication)

#### TypeScript repositories added (`repositories/bi/`)

`IntelligenceIntakeRepository`, `MetricDefinitionRepository`, `MetricCalculationRepository`, `AnalysisRunRepository`, `AnalysisResultRepository`, `ForecastRepository`, `AnomalyRepository`, `RiskAssessmentRepository`, `InsightPackageRepository`, `BIPublicationPackageRepository` (+ typed errors `NotFoundError`, `ConflictError`, `ValidationError`, `InvalidTransitionError`)

#### RLS coverage

All 48 tables RLS-enabled **and forced** (first use of `FORCE ROW LEVEL SECURITY` in this repository — strengthens the Stage 2A–2C null-safe fail-closed pattern, which only enabled RLS).

#### Append-only enforcement

29 evidence/history tables reject UPDATE/DELETE unconditionally via a shared `forbid_mutation()` trigger, enforced even for the BYPASSRLS admin role. `forecast_runs` and `bi_publication_packages` have dedicated immutability/lifecycle-transition guard triggers.

#### Outbox event functions added

10 required `bi.*` events (`bi.metric.calculated`, `bi.kpi.updated`, `bi.analysis.started/completed/failed`, `bi.anomaly.detected`, `bi.forecast.generated`, `bi.forecast.accuracy_recorded`, `bi.insight.published`, `bi.data.published`), each backed by a `SECURITY DEFINER` function via the established `emit_outbox_event` helper pattern.

#### BO→BI handoff contract

`packages/handoff-contracts/src/bo-to-bi.ts` completed: strict versioned contract, accepts only `ready`/`dispatched` BO publication packages.

#### Objects (live-verified)

314 indexes, 79 triggers, 14 functions.

#### Test count

703 tests in the database package (702 pass, 1 intentional skip-guard): 135 Stage 2D structural + 111 Stage 2D live integration + 349 prior-stage regression (Stage 2A 114, Stage 2B 146 + 53 live DA, Stage 2C 97 + 36 live BO) + 6 migration-0001 + 4 tx helpers. Plus 45 handoff-contracts tests (15 new bo-to-bi + 16 dal-to-bo + 14 sim-to-adi regression).

Validation at freeze (2026-07-21): full database suite 702/703 (run twice against the same DB, identical results — confirms rerun/idempotency); empty-database installation of 0001→0049 clean; frozen 0001–0036 byte-identical (SHA-256 verified); `pnpm lint` 21/21; `pnpm typecheck` clean; `pnpm build` 21/21; root layer regression 180/180; monorepo ADI regression 106/106.

---

## Files changed (Stage 2D)

| File | Change |
|------|--------|
| `infrastructure/database/migrations/0037–0049.sql` | Created — 13 migration files |
| `packages/database/src/repositories/bi/*.ts` | Created — 10 repository classes + errors + barrel index |
| `packages/database/src/index.ts` | Updated — exports BI repositories |
| `packages/database/tests/migration-stage2d.test.ts` | Created — 135 structural tests |
| `packages/database/tests/bi-repositories.integration.test.ts` | Created — 112 live integration tests (111 pass + 1 skip-guard) |
| `packages/handoff-contracts/src/bo-to-bi.ts` | Updated — placeholder replaced with strict contract |
| `packages/handoff-contracts/tests/bo-to-bi.contract.test.ts` | Created — 15 contract tests |
| `packages/event-contracts/src/index.ts` | Updated — 10 `bi.*` event types |
| `docs/database-stage-2d-business-intelligence.md` | Created |
| `docs/database/IMPLEMENTATION_STATUS.md` | Updated (this file) |

---

## Frozen migrations (0001–0049)

Stage 1 + 2A (0001–0012), Stage 2B (0013–0022), Stage 2C (0023–0036): Validated — FROZEN (unchanged, byte-identical, SHA-256 verified).

| File | Status |
|------|--------|
| `0037_create_bi_schema_intake.sql` | Validated — FROZEN |
| `0038_create_bi_datasets.sql` | Validated — FROZEN |
| `0039_create_bi_metrics.sql` | Validated — FROZEN |
| `0040_create_bi_analysis.sql` | Validated — FROZEN |
| `0041_create_bi_findings_trends.sql` | Validated — FROZEN |
| `0042_create_bi_forecasts.sql` | Validated — FROZEN |
| `0043_create_bi_anomalies.sql` | Validated — FROZEN |
| `0044_create_bi_benchmarks_risk.sql` | Validated — FROZEN |
| `0045_create_bi_publication.sql` | Validated — FROZEN |
| `0046_create_bi_registry.sql` | Validated — FROZEN |
| `0047_create_bi_indexes.sql` | Validated — FROZEN |
| `0048_create_bi_rls_policies.sql` | Validated — FROZEN |
| `0049_create_bi_triggers_events.sql` | Validated — FROZEN |

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

### Stage 2C — Business Operations Schema (migrations 0023–0036)

#### New PostgreSQL schema

| Schema | Tables | Purpose |
|--------|--------|---------|
| `business_operations` | 48 | Operational records: pipeline → orders → billing → procurement → inventory → fulfilment → workforce → assets → finance → risk → publication |

**Total Stage 2C tables: 48 in 1 schema** (canonical entities reused from `platform`; no duplication)

#### Table groups

| Group | Tables |
|-------|--------|
| Core profile | `business_profile_extensions`, `department_responsibilities`, `role_assignments` |
| Customer pipeline | `leads`, `opportunities`, `opportunity_activities`, `customer_accounts` |
| Quotations & orders | `quotations`, `quotation_line_items`, `order_line_items`, `order_events` |
| Billing & procurement | `invoice_line_items`, `payment_allocations`, `credit_notes`, `purchase_orders`, `purchase_order_line_items`, `purchase_receipts` |
| Supplier & inventory | `supplier_agreements`, `supplier_performance_scores`, `inventory_balances`, `inventory_movements` |
| Warehouse & fulfilment | `warehouse_zones`, `storage_locations`, `fulfilment_orders`, `fulfilment_items`, `delivery_notes` |
| Workforce & tasks | `employee_assignments`, `work_schedules`, `tasks`, `task_assignments`, `workflow_instances` |
| Scheduling & assets | `resource_bookings`, `maintenance_schedules`, `maintenance_records`, `asset_inspections` |
| Finance & support | `expense_claims`, `expense_items`, `support_cases`, `case_activities` |
| Risk & incidents | `compliance_controls`, `risk_assessments`, `incidents`, `incident_escalations` |
| Performance & publication | `operational_performance_records`, `bo_publication_packages`, `bo_handoff_records`, `bo_layer_assemblies`, `bo_layer_deployments` |

#### TypeScript repositories added (`repositories/bo/`)

- `LeadRepository`, `OpportunityRepository`, `PurchaseOrderRepository`,
  `SupportCaseRepository`, `IncidentRepository`, `TaskRepository`,
  `InventoryBalanceRepository` (+ typed errors `NotFoundError`, `InvalidTransitionError`)

#### Outbox event functions added

16 SECURITY DEFINER functions in `business_operations` emit typed events to `events.outbox_events`:
`bo.lead.created`, `bo.lead.converted`, `bo.opportunity.stage_changed`,
`bo.quotation.sent`, `bo.order.authorized`, `bo.order.completed`,
`bo.invoice.issued`, `bo.payment.received`, `bo.purchase_order.approved`,
`bo.inventory.movement_recorded`, `bo.fulfilment.dispatched`,
`bo.support_case.opened`, `bo.support_case.resolved`, `bo.incident.raised`,
`bo.incident.resolved`, `bo.data.published`

#### RLS coverage

All 48 tables RLS-enabled with 48 null-safe tenant+workspace isolation policies.

#### Objects (live-verified)

193 explicit indexes (275 total), 33 `updated_at` triggers, 17 functions.

#### Test count

456 tests pass: 97 Stage 2C structural + 36 BO live integration
(tenant isolation, cross-tenant rejection, outbox, idempotency,
invalid-transition rejection) + 323 prior-stage regression.

Validation at freeze (2026-07-21): `pnpm --filter @infinicus/database test`
456/456 · `pnpm lint` 21/21 · `pnpm typecheck` clean · `pnpm build` 21/21 ·
all 36 migrations applied cleanly to empty PostgreSQL 16 database.

---

## Files changed (Stage 2C)

| File | Change |
|------|--------|
| `infrastructure/database/migrations/0023–0036.sql` | Created — 14 migration files |
| `packages/database/src/repositories/bo/*.ts` | Created — 7 repository classes + errors + barrel index |
| `packages/database/src/index.ts` | Updated — exports BO repositories |
| `packages/database/tests/migration-stage2c.test.ts` | Created — 97 structural tests |
| `packages/database/tests/bo-repositories.integration.test.ts` | Created — 36 live integration tests |
| `packages/database/tests/helpers/integration.ts` | Created — shared live-test harness |
| `packages/shared-types/src/index.ts` | Updated — `HandoffEnvelope` alias (fixed pre-existing build break) |
| `packages/testing/src/mock-handoff.ts` | Updated — mock aligned to `LayerHandoff` shape |
| `docs/database-stage-2c-business-operations.md` | Created |
| `docs/database/IMPLEMENTATION_STATUS.md` | Updated (this file) |

---

## Frozen migrations (0001–0036)

| File | Status |
|------|--------|
| `0001`–`0012` | Validated — FROZEN (Stage 1 + 2A) |
| `0013`–`0022` | Validated — FROZEN (Stage 2B) |
| `0023_create_bo_core_profile.sql` | Validated — FROZEN |
| `0024_create_bo_customer_pipeline.sql` | Validated — FROZEN |
| `0025_create_bo_quotations_orders.sql` | Validated — FROZEN |
| `0026_create_bo_billing_procurement.sql` | Validated — FROZEN |
| `0027_create_bo_supplier_inventory.sql` | Validated — FROZEN |
| `0028_create_bo_warehouse_fulfilment.sql` | Validated — FROZEN |
| `0029_create_bo_workforce_tasks.sql` | Validated — FROZEN |
| `0030_create_bo_scheduling_assets.sql` | Validated — FROZEN |
| `0031_create_bo_finance_support.sql` | Validated — FROZEN |
| `0032_create_bo_risk_incidents.sql` | Validated — FROZEN |
| `0033_create_bo_performance_publication.sql` | Validated — FROZEN |
| `0034_create_bo_indexes.sql` | Validated — FROZEN |
| `0035_create_bo_rls_policies.sql` | Validated — FROZEN |
| `0036_create_bo_triggers_events.sql` | Validated — FROZEN |

---

## Known blockers

- None for Stages 1–2D. Live validation runs against a local PostgreSQL 16
  instance (`infinicus_test`) with roles `app_test_user` (RLS enforced) and
  `infinicus_test_admin` (BYPASSRLS); connection strings are supplied via
  `DATABASE_URL` / `ADMIN_DATABASE_URL` environment variables only.
- Integration tests are skipped automatically when `DATABASE_URL` is unset
  (structural tests still run).
- Stage 2D's 29 append-only tables reject DELETE unconditionally (even for
  the BYPASSRLS admin role) and cascade `ON DELETE RESTRICT` up through
  their parent rows. Test teardown does not attempt to delete
  `business_intelligence` rows for this reason — the disposable test
  database is the reset mechanism between full validation runs, not
  per-suite cleanup. This is by design (analytical evidence is permanent),
  not a defect.

---

## Exact next task

**Stage 2E or later Database work, or BUILD-10 (Platform assembly)**

No authoritative specification exists yet for the next database or platform
build. Author one before starting. Start only when instructed.
