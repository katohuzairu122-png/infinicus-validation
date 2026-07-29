# BUILD-09 Completion Report — DB-BI: Database Stage 2D Business Intelligence Persistence

- **Build ID:** BUILD-09
- **Layer:** DB-BI (database/repository tier — distinct from the completed browser BI root blocks, BUILD-02)
- **Date:** 2026-07-21
- **Branch:** `claude/infinicus-engine-debug-3loqb4`
- **Specification:** `docs/implementation-queue/BUILD-09-DB-BI-SPECIFICATION.md` (followed exactly; git-verified unchanged against `799f4cf`)
- **Status:** COMPLETED

## What Was Built

A new `business_intelligence` PostgreSQL schema (migrations **0037–0049**, 13 files) implementing all 12 required table groups from the frozen specification, plus 10 strict TypeScript repository adapters, 10 BI outbox events, and completion of the `bo-to-bi.ts` handoff contract.

### Migration range and integrity

| | |
|---|---|
| Frozen Stage 2C final migration | `0036` (verified, not guessed) |
| Stage 2D range | `0037`–`0049` |
| Frozen migrations 0001–0036 | **byte-identical** (SHA-256 `76642d0c82f00d64ccf6fc45eaf61cbf22a1c645c342dafc4f982cc61fe19f50`, matches pre-implementation baseline) |
| Migration self-registration | all 13 files insert into `_migrations` with `ON CONFLICT (filename) DO NOTHING`, matching the Stage 2B/2C convention (verified by structural test — this convention was discovered mid-implementation and retrofitted to all 13 files) |

### Schema objects (live-verified)

| Object | Count |
|---|---|
| Tables | 48 |
| Tables with RLS enabled **and forced** | 48/48 |
| Indexes | 314 |
| Triggers | 79 (19 `updated_at`, 29 append-only guards via one DO-block loop, 1 forecast-run immutability guard, 1 publication lifecycle guard, plus supporting) |
| Functions | 14 (`forbid_mutation`, `enforce_forecast_run_immutability`, `enforce_publication_transition`, `emit_outbox_event`, 10 `emit_*` event wrappers) |

### Table groups (all 12 required groups implemented)

A. Intake/lineage — `intelligence_intake_packages`, `_versions`, `_source_references`, `_domain_inputs`, `_processing_status_history`
B. Datasets — `analytical_datasets`, `_versions`, `dataset_lineage`, `dataset_data_references`
C. Metrics/KPIs — `metric_definitions`, `_versions`, `metric_calculated_values`, `metric_time_series_values`
D. Analysis lifecycle — `analysis_requests`, `analysis_runs`, `_inputs`, `_outputs`, `_status_history`
E. Findings — `findings`, `finding_versions`, `finding_evidence`, plus `trends`/`trend_observations`
F–G. Forecasts — `forecast_models`, `_requests`, `_runs`, `_points`, `_accuracy_records`
H. Anomalies — `anomaly_rules`, `_versions`, `anomaly_detections`, `_evidence`, `_status_history`
I. Benchmarks — `benchmark_definitions`, `_datasets`, `comparison_runs`, `comparison_results`
J. Risk — `risk_models`, `risk_assessments`, `risk_factors`
K. Publication — `insight_packages`, `_versions`, `bi_publication_packages`, `_events`
L. Registry/deployment — `bi_component_registry`, `_versions`, `bi_deployments`, `_rollbacks`

### RLS — enabled AND forced (strengthening, not weakening, prior convention)

All 48 tables use `ENABLE ROW LEVEL SECURITY` **and** `FORCE ROW LEVEL SECURITY` — the first use of FORCE in this repository (Stage 2A–2C only enable). The null-safe fail-closed policy predicate (`current_setting('app.tenant_id', true)::uuid AND current_setting('app.workspace_id', true)::uuid`) is preserved unchanged. Live-verified: missing context returns zero rows; cross-tenant reads/writes rejected.

### Append-only enforcement

29 evidence/history tables reject UPDATE and DELETE unconditionally via a shared `forbid_mutation()` trigger — enforced even for the BYPASSRLS admin role, stronger than any grant-based convention. `forecast_runs` and `bi_publication_packages` (both otherwise mutable) get dedicated guard triggers: `enforce_forecast_run_immutability` (blocks status/assumption changes once `publication_status = 'published'`) and `enforce_publication_transition` (rejects any lifecycle jump outside the defined state machine: `draft→ready→dispatched→{acknowledged,rejected,revoked}`, `acknowledged→revoked`).

### BO→BI handoff contract

`packages/handoff-contracts/src/bo-to-bi.ts` — placeholder replaced with a strict versioned (`1.0.0`) `LayerHandoff` contract. Accepts only `ready`/`dispatched` BO publication packages; rejects malformed payloads, missing ownership, invalid period ordering, non-serializable content, credential-like data, and embedded BI conclusions (`finding`/`insight`/`recommendation`/`analysisResult` fields forbidden). 15 contract tests.

### BI events

10 required events added to `LayerEventType` (superseding the single `bi.insight.generated` stub, which had no emitter in the new design): `bi.metric.calculated`, `bi.kpi.updated`, `bi.analysis.started/completed/failed`, `bi.anomaly.detected`, `bi.forecast.generated`, `bi.forecast.accuracy_recorded`, `bi.insight.published`, `bi.data.published`. Each backed by a `SECURITY DEFINER` emit function; `bi.data.published` rejects target layers outside `{business_digital_twin, simulation, ai_decision_intelligence}`.

### Repositories (`packages/database/src/repositories/bi/`)

10 strict-TypeScript repositories (8 named in the spec + 2 justified by table-group coverage — `IntelligenceIntakeRepository` for intake/datasets, `RiskAssessmentRepository` folding in benchmarks): `IntelligenceIntakeRepository`, `MetricDefinitionRepository`, `MetricCalculationRepository`, `AnalysisRunRepository`, `AnalysisResultRepository`, `ForecastRepository`, `AnomalyRepository`, `RiskAssessmentRepository`, `InsightPackageRepository`, `BIPublicationPackageRepository` (renamed from the spec's `PublicationPackageRepository` to avoid a name collision with the existing DA repository of the same name). Parameterized SQL throughout; `withTenantTransaction`; typed `NotFoundError`/`ConflictError`/`ValidationError`/`InvalidTransitionError`; `parseFloat(String(...))` on all `numeric` columns per the established Stage 2C convention; no `any`, no unsafe casts, no silent catches.

## Defects Found and Fixed During Implementation

1. **Nested transaction bug** — `BIPublicationPackageRepository.publish()`/`transition()` originally called `this.recordEvent()` (which opens its own `withTenantTransaction`) from inside an already-open transaction callback; the inner query ran on a separate connection and couldn't see the outer uncommitted insert, causing spurious `NotFoundError`. Fixed by inlining the event insert on the shared `client`.
2. **`forecast_requests` status enum mismatch** — `ForecastRepository.createRun` inserted `status = 'accepted'`, not present in the migration's CHECK constraint (`requested/running/completed/failed/cancelled`). Fixed to `'requested'`.
3. **`risk_assessments` design conflict** — the migration correctly made `risk_assessments` append-only (per spec §9), but the repository's `publishAssessment` tried to `UPDATE` it. Fixed by making publication an append-only operation: `publishAssessment` now inserts a new `published` row from the draft's values rather than mutating the original.
4. **Missing test fixture** — `anomaly_detections.acknowledged_by` / `anomaly_status_history.actor_id` reference `identity.users(id)`; the test harness lacked a user fixture. Added.
5. **Test-only bugs**: three structural-test assertions checked the wrong literal (line-wrapped constraint text, a miscounted FORCE regex, and a DO-block trigger-name assumption); a `findings.latestVersion` assertion expected the wrong value; six intake tests used fabricated (non-existent) `bo_publication_package_id` values instead of real fixtures, causing FK violations — fixed with a `createBoPackage()` helper that inserts real upstream rows.
6. **Teardown vs. append-only enforcement** — the original teardown attempted to `DELETE` rows from the 29 forbid-mutation tables it had just protected, which is now correctly rejected by the database for every role including BYPASSRLS admin, and (via `ON DELETE RESTRICT`) transitively blocks deletion of every ancestor row (tenants, businesses, mutable BI tables). Redesigned teardown to not attempt BI-schema deletes at all — analytical evidence is permanent by design; the disposable test database is the reset mechanism, not per-suite cleanup. Verified idempotent: the full 703-test suite was run twice against the same database with identical results (702 pass / 1 intentional skip, both runs).

## Validation Results

| Gate | Result |
|---|---|
| Structural tests (`migration-stage2d.test.ts`) | 135/135 pass |
| Live integration tests (`bi-repositories.integration.test.ts`) | 111/111 pass (1 intentional skip-guard when `DATABASE_URL` unset) — **exceeds the ≥100 meaningful-test requirement** |
| BO→BI contract tests | 15/15 pass |
| Full database package (all 9 test files) | 702/703 pass (1 intentional skip) — run twice against the same DB with identical results, confirming rerun/idempotency |
| Migration rerun/idempotency (via built `migrate.ts`) | confirmed — all 49 files reported `skip` on second run, "Migrations complete." |
| Empty-database installation | confirmed — full drop/recreate + apply of 0001→0049 in strict order, zero errors |
| Frozen migrations 0001–0036 | byte-identical (SHA-256 match against pre-implementation baseline) |
| RLS enabled + forced | 48/48 tables (live query) |
| Fail-closed (no context) | 0 rows returned (live query) |
| Cross-tenant/workspace rejection | verified live for metric definitions, findings, risk assessments, domain listings, anomaly acknowledgement, publication dispatch |
| Append-only enforcement | verified live via direct `UPDATE`/`DELETE` attempts against 8+ representative tables, all rejected with `append-only` error |
| Outbox atomicity | verified live — `emit_metric_calculated`, `emit_anomaly_detected` insert into `events.outbox_events`; `emit_data_published` rejects invalid target layers |
| Transaction rollback | verified — failed validation and failed CHECK constraints leave zero partial rows |
| handoff-contracts full suite (bo-to-bi + dal-to-bo + sim-to-adi regression) | 45/45 pass |
| Root layer regression (DA+ADI+ABA+BI+DT+OM+CL) | 180/180 pass |
| Monorepo ADI source regression | 106/106 pass |
| `pnpm lint` | 21/21 tasks |
| `pnpm typecheck` | clean |
| `pnpm build` | 21/21 tasks |

Also confirmed: **no browser BI root blocks (BUILD-02) modified; no Digital Twin/Simulation/ADI persistence implemented; no downstream consumer implemented; Simulation mathematics untouched; `cl-feedback.ts` untouched; BUILD-10 not implemented; frozen specification unchanged during implementation (git-diff against `799f4cf` is empty).**

## Environmental Note

The local test PostgreSQL service and its data were reset multiple times during this session (container behavior, unrelated to BUILD-09 logic). Each reset required re-provisioning the disposable `infinicus_test` database, roles, and grants from empty before continuing — the final validation pass (all numbers above) was captured against a freshly re-provisioned database applying all 49 migrations from empty.

## Queue Transition

- BUILD-09: ready → in_progress → **completed**
- `currentReadyBuild` → none
- BUILD-10 (PLATFORM — platform assembly) remains **pending**: it has no authoritative specification in the manifest. Authoring the BUILD-10 specification is the next queue action.
