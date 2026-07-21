# Database Stage 2D — Business Intelligence Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-21)

Frozen migration range after Stage 2D: **0001–0049**

## Overview

Stage 2D creates the `business_intelligence` schema with 48 tables owning
Business Intelligence's analytical truth: validated intake of Business
Operations publication packages, analytical datasets, metric definitions and
calculated values, analysis lifecycle, findings, trends, forecasts,
anomalies, benchmarks, risk intelligence, and publication of insight
packages onward to Business Digital Twin, Simulation, and AI Decision
Intelligence.

This is the database/repository persistence tier for BI — distinct from the
completed browser BI root blocks (`business-intelligence/`, BUILD-02), which
remain the layer's analytical UI/computation surface. Stage 2D does not
implement analytical algorithms; it persists their inputs, outputs, and
lifecycle.

## Migration Sequence

| File | Contents |
|------|----------|
| `0037_create_bi_schema_intake.sql` | `business_intelligence` schema + `intelligence_intake_packages`, `_versions`, `_source_references`, `_domain_inputs`, `_processing_status_history` |
| `0038_create_bi_datasets.sql` | `analytical_datasets`, `_versions`, `dataset_lineage`, `dataset_data_references` |
| `0039_create_bi_metrics.sql` | `metric_definitions`, `_versions`, `metric_calculated_values`, `metric_time_series_values` |
| `0040_create_bi_analysis.sql` | `analysis_requests`, `analysis_runs`, `_inputs`, `_outputs`, `_status_history` |
| `0041_create_bi_findings_trends.sql` | `findings`, `finding_versions`, `finding_evidence`, `trends`, `trend_observations` |
| `0042_create_bi_forecasts.sql` | `forecast_models`, `_requests`, `_runs`, `_points`, `_accuracy_records` |
| `0043_create_bi_anomalies.sql` | `anomaly_rules`, `_versions`, `anomaly_detections`, `_evidence`, `_status_history` |
| `0044_create_bi_benchmarks_risk.sql` | `benchmark_definitions`, `_datasets`, `comparison_runs`, `comparison_results`, `risk_models`, `risk_assessments`, `risk_factors` |
| `0045_create_bi_publication.sql` | `insight_packages`, `_versions`, `bi_publication_packages`, `_events` |
| `0046_create_bi_registry.sql` | `bi_component_registry`, `_versions`, `bi_deployments`, `_rollbacks` |
| `0047_create_bi_indexes.sql` | 314 indexes across all 48 tables |
| `0048_create_bi_rls_policies.sql` | RLS enabled **and forced** on all 48 tables (null-safe tenant+workspace isolation) |
| `0049_create_bi_triggers_events.sql` | 19 `updated_at` triggers, append-only enforcement (29 tables), 2 lifecycle guards, 14 SECURITY DEFINER outbox functions |

Frozen migrations 0001–0036 were not modified (byte-identical, SHA-256 verified).

## Canonical Entity Integration (no duplication)

Stage 2D reuses `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, `identity.service_accounts`, and
`business_operations.bo_publication_packages` / `bo_handoff_records`. No
tenant/workspace/business identity, user, or operational-truth table is
duplicated. `intelligence_intake_packages.bo_publication_package_id` is a
`NOT NULL` FK to the canonical BO publication package.

## Row-Level Security — Enabled and Forced

All 48 tables use both `ENABLE ROW LEVEL SECURITY` and
`FORCE ROW LEVEL SECURITY` — the first use of FORCE in this repository.
Stage 2A–2C only enable RLS; Stage 2D strengthens this because analytical
evidence must remain isolated even from roles that would otherwise bypass
RLS (excluding the intentionally BYPASSRLS `infinicus_test_admin` role used
for test fixtures, which FORCE does not affect by Postgres semantics for
table owners — the null-safe fail-closed predicate itself is unchanged):

```sql
USING (
  tenant_id    = current_setting('app.tenant_id',    true)::uuid
AND workspace_id = current_setting('app.workspace_id', true)::uuid
)
```

## Append-Only Enforcement

29 evidence/history tables reject `UPDATE` and `DELETE` unconditionally via
a shared `business_intelligence.forbid_mutation()` trigger — enforced for
every role, including BYPASSRLS admin. `forecast_runs` and
`bi_publication_packages` (otherwise mutable) have dedicated guards:

- `enforce_forecast_run_immutability` — blocks status/assumption changes
  once `publication_status = 'published'`
- `enforce_publication_transition` — enforces the valid lifecycle state
  machine (`draft→ready→dispatched→{acknowledged,rejected,revoked}`,
  `acknowledged→revoked`); any other transition is rejected

**Operational implication:** because these triggers apply to every role and
cascade via `ON DELETE RESTRICT` up through parent rows, `business_intelligence`
rows — and any tenant/business row they reference — cannot be deleted once
created. Test fixtures use disposable per-test identifiers; the disposable
test database is the reset mechanism, not per-suite cleanup.

## Outbox Events

10 required events, each backed by a `SECURITY DEFINER` function using the
established `emit_outbox_event` helper: `bi.metric.calculated`,
`bi.kpi.updated`, `bi.analysis.started`, `bi.analysis.completed`,
`bi.analysis.failed`, `bi.anomaly.detected`, `bi.forecast.generated`,
`bi.forecast.accuracy_recorded`, `bi.insight.published`, `bi.data.published`.
`bi.data.published` rejects target layers outside
`{business_digital_twin, simulation, ai_decision_intelligence}`.

## BO-to-BI Handoff Contract

`packages/handoff-contracts/src/bo-to-bi.ts` — strict versioned (`1.0.0`)
contract replacing the placeholder. Accepts only `ready`/`dispatched` BO
publication packages; validates ownership, period ordering, serializability,
and forbids embedded BI conclusions.

## Repository Adapters (`packages/database/src/repositories/bi/`)

| Repository | Coverage |
|---|---|
| `IntelligenceIntakeRepository` | intake, source refs, datasets/versions |
| `MetricDefinitionRepository` | metric definitions and versions |
| `MetricCalculationRepository` | calculated values, time series |
| `AnalysisRunRepository` | requests, runs, lifecycle transitions |
| `AnalysisResultRepository` | inputs/outputs, findings, trends |
| `ForecastRepository` | models, runs, points, accuracy |
| `AnomalyRepository` | rules, detections, lifecycle |
| `RiskAssessmentRepository` | risk models/assessments/factors, benchmarks |
| `InsightPackageRepository` | insight packages and versions |
| `BIPublicationPackageRepository` | publication lifecycle, component registry/deployment |

All repositories require a `TenantContext`, execute inside
`withTenantTransaction`, and use `parseFloat(String(...))` for `numeric`
columns per the established Stage 2C convention.

## Validation Results (re-verified at freeze, 2026-07-21)

Live database: local PostgreSQL 16, database `infinicus_test`. Full
empty-database installation of migrations 0001→0049.

| Check | Result |
|---|---|
| Structural + live tests | **702/703** passed (1 intentional skip-guard); run twice against the same database with identical results |
| Lint | 21/21 tasks |
| Typecheck | clean |
| Build | 21/21 tasks |
| Live schema | 48 tables, 48 RLS-forced, 314 indexes, 79 triggers, 14 functions |
| Frozen migration integrity | 0001–0036 byte-identical (SHA-256) |
| Root layer regression | 180/180 |
| Monorepo ADI regression | 106/106 |

The 111 live BI integration tests cover: fail-closed RLS, cross-tenant
rejection, BO intake and idempotency, dataset/metric/finding/forecast/
anomaly/risk lifecycle and validation, append-only enforcement (direct
UPDATE/DELETE rejected on 8+ tables), publication lifecycle and idempotent
replay, outbox atomicity, and transaction rollback.

## What Remains

- Stage 2E or later database work, or BUILD-10 (Platform assembly)
- Not started in Stage 2D.
