# INFINICUS DATABASE STAGE 2D — BUSINESS INTELLIGENCE IMPLEMENTATION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

This prompt is implementation-ready. Do not redesign the architecture. Inspect the existing code, align to established conventions, implement the specified scope, run validation, and return the completion report.

Read and obey:

1. `CLAUDE.md`
2. Database Stage 2A completion report
3. Database Stage 2B completion report
4. Database Stage 2C completion report
5. Frozen migration manifest
6. Existing `packages/database` conventions
7. Existing tenant transaction and PostgreSQL integration-test harness
8. Business Intelligence architecture blocks BI-01 through BI-25
9. Platform Event Catalogue
10. Layer Handoff Contracts
11. Event Backbone contracts already implemented at the time of execution

## Objective

Implement Database Stage 2D only:

```text
Business Intelligence persistence
```

Create the canonical schema:

```text
business_intelligence
```

Do not create competing schemas such as `bi`, `analytics`, or `intelligence`.

Use the next actual migration number after the confirmed final Stage 2C migration. Do not guess the number.

## Frozen migration rule

All migrations through the final Stage 2C migration are frozen. Do not edit them.

When a defect is discovered:

```text
document defect
→ create forward-only correction migration
→ preserve frozen checksums
```


## Canonical references

Use:

```text
tenancy.tenants
tenancy.workspaces
platform.businesses
identity users/service accounts where applicable
business_operations publication packages and source references
```

Do not duplicate business identity, customers, orders, payments, inventory, or operational truth.

Business Intelligence owns analytical truth, not operational truth.

## Required table groups

### BI intake and source registration

```text
intelligence_intake_packages
intelligence_intake_package_versions
intelligence_source_references
intelligence_domain_inputs
intelligence_processing_status_history
```

### Analytical datasets

```text
analytical_datasets
analytical_dataset_versions
analytical_dataset_columns
analytical_dataset_partitions
analytical_dataset_quality
analytical_dataset_lineage
```

### Metric definitions and values

```text
metric_definitions
metric_definition_versions
metric_dimensions
metric_values
metric_value_evidence
metric_quality_records
```

Supported metric types:

```text
numeric
percentage
currency
count
duration
rate
boolean
categorical
```

Use `NUMERIC` for financial values.

### Analysis requests and runs

```text
analysis_requests
analysis_runs
analysis_run_steps
analysis_run_inputs
analysis_run_outputs
analysis_run_status_history
```

Statuses:

```text
requested
queued
running
completed
failed
cancelled
expired
```

### Findings

```text
analysis_findings
analysis_finding_versions
finding_evidence
finding_limitations
finding_relationships
```

### Trends

```text
trend_definitions
trend_runs
trend_observations
trend_findings
trend_evidence
```

Trend directions:

```text
increasing
decreasing
stable
volatile
seasonal
structural_break
inconclusive
```


### Forecasts

```text
forecast_models
forecast_model_versions
forecast_runs
forecast_series
forecast_points
forecast_intervals
forecast_accuracy_records
forecast_evidence
```

### Anomalies

```text
anomaly_rules
anomaly_rule_versions
anomaly_runs
anomaly_detections
anomaly_evidence
anomaly_resolution_records
```

### Benchmarks and comparisons

```text
benchmark_definitions
benchmark_versions
benchmark_runs
benchmark_values
comparison_runs
comparison_results
```

### Risk intelligence

```text
risk_models
risk_model_versions
risk_assessments
risk_factors
risk_scores
risk_evidence
risk_limitations
```

### Confidence, quality, and limitations

```text
intelligence_confidence_records
intelligence_quality_records
intelligence_limitations
intelligence_validation_records
```

### Publication and handoff

```text
intelligence_publication_packages
intelligence_publication_package_versions
intelligence_publication_items
intelligence_handoff_receipts
intelligence_handoff_acknowledgements
intelligence_handoff_rejections
```

Publication targets:

```text
business_digital_twin
simulation
ai_decision_intelligence
```

### Registry and deployment

```text
intelligence_component_registry
intelligence_component_versions
intelligence_deployments
intelligence_rollbacks
```


## Required relationships

Implement explicit relationships between:

```text
intake package → source publication package
intake package → analytical dataset
dataset version → analysis run
analysis run → findings, trends, forecasts, anomalies, and risk assessments
finding → evidence
forecast run → points and intervals
publication package → selected BI records
publication package → target layer
handoff receipt → publication package version
deployment → component version
```

Do not allow orphan analytical outputs.

## Status rules

### Intake package

```text
received
validating
accepted
rejected
processing
completed
failed
revoked
```

### Dataset

```text
draft
preparing
ready
published
deprecated
revoked
```

### Analysis

```text
requested
queued
running
completed
failed
cancelled
expired
```

### Publication package

```text
draft
validating
ready
published
rejected
revoked
superseded
```

Reject invalid transitions through constraints, repository logic, or both.

## Data rules

Use UUID identifiers, TIMESTAMPTZ timestamps, NUMERIC for money and precise scores, and JSONB only for genuinely variable structures.

All quality, reliability, confidence, and risk scores must satisfy:

```text
0 <= score <= 1
```

Persist quality, source reliability, analysis confidence, forecast confidence, finding confidence, and risk confidence separately.

Support effective, valid, reporting, observation, generation, and publication timestamps. Reject invalid ranges.


## Suggested migration grouping

Use the next actual number after Stage 2C:

```text
<next>_business_intelligence_schema.sql
<next+1>_bi_intake_and_sources.sql
<next+2>_bi_datasets_and_lineage.sql
<next+3>_bi_metrics.sql
<next+4>_bi_analysis_runs.sql
<next+5>_bi_findings_and_trends.sql
<next+6>_bi_forecasts.sql
<next+7>_bi_anomalies_and_benchmarks.sql
<next+8>_bi_risk_confidence_quality.sql
<next+9>_bi_publication_and_handoffs.sql
<next+10>_bi_registry_deployment.sql
<next+11>_bi_indexes.sql
<next+12>_bi_rls.sql
<next+13>_bi_triggers.sql
<next+14>_bi_event_functions.sql
```

Adjust only to align with repository convention.

## Constraints

Create named constraints for valid score ranges, date ranges, horizons, counts, versions, statuses, target layers, metric types, trend directions, anomaly statuses, and risk scores.

Enforce unique active versions, package versions, model versions, dataset versions, request idempotency keys, and publication versions.

## Foreign keys

Use deliberate delete behavior. Protect published datasets, completed analyses, findings, forecast results, risk assessments, publication packages, handoff history, deployment history, audit, and provenance.

Prefer `RESTRICT` for published and historical evidence.

## Indexes

Index tenant, workspace, business, status, timestamps, reporting period, source package, dataset version, analysis request/run, metrics, finding category, forecast model/horizon, anomaly status, risk model, publication target, correlation, handoff package, component version, and deployment status.

Add justified composite and partial indexes. Avoid redundancy.


## Row-level security

Enable RLS for every tenant-owned table.

Enforce tenant, workspace, and business scope. Missing context fails closed.

Verify:

- tenant A cannot access tenant B;
- same-tenant workspace A cannot access workspace B;
- business scope is enforced;
- application role cannot bypass RLS;
- privileged pool is restricted to setup and approved infrastructure operations.

## Immutability and versioning

Immutable after publication or completion:

```text
dataset versions
analysis outputs
findings
forecast results
risk assessments
publication packages
handoff acknowledgements
deployment evidence
rollback evidence
```

Corrections create new versions.

## Event outbox functions

Create transaction-safe wrappers or repository helpers for:

```text
bi.analysis.requested
bi.analysis.completed
bi.finding.created
bi.forecast.completed
bi.anomaly.detected
bi.risk_assessed
bi.data.published
```

Use registered canonical names when they differ.

Every event preserves tenant, workspace, business, aggregate, event version, correlation, causation, and provenance.

Reuse the Stage 2A outbox implementation.

## Repository adapters

Implement at minimum:

```text
BusinessIntelligenceIntakeRepository
AnalyticalDatasetRepository
MetricRepository
AnalysisRepository
FindingRepository
ForecastRepository
AnomalyRepository
RiskIntelligenceRepository
IntelligencePublicationRepository
IntelligenceHandoffRepository
```

Use typed records, parameterized SQL, tenant transactions, controlled errors, idempotency, and no cross-layer table writes.


## Live PostgreSQL 16 tests

Use the existing two-pool harness.

Cover:

- intake package creation, versioning, scope, duplicate and revocation behavior;
- dataset versions, columns, partitions, lineage, quality, and publication immutability;
- metric types, values, evidence, and invalid-value rejection;
- analysis requests, runs, valid/invalid transitions, inputs, outputs, rollback, and events;
- findings, confidence, evidence, limitations, trends, and versioning;
- forecast models, runs, points, intervals, accuracy, and immutability;
- anomaly rules, detections, status transitions, evidence, and resolution;
- risk models, assessments, factors, bounded scores, evidence, and limitations;
- publication, target validation, acknowledgement, rejection, revocation, idempotency, and `bi.data.published`;
- component registry, deployment, and rollback history;
- tenant, workspace, and business isolation;
- fail-closed behavior;
- application-role RLS;
- domain and outbox rollback atomicity.

Target at least 100 meaningful live integration tests.

## Structural tests

Verify schema, tables, columns, constraints, foreign keys, indexes, RLS, policies, triggers, event functions, repositories, exports, migration count, and frozen checksum manifest.

## Documentation

Create:

```text
docs/database/stage-2d-business-intelligence.md
docs/database/business-intelligence-schema.md
docs/database/business-intelligence-lineage.md
docs/database/business-intelligence-quality-confidence.md
docs/database/business-intelligence-events.md
docs/database/business-intelligence-repositories.md
docs/database/business-intelligence-rls.md
docs/database/business-intelligence-test-plan.md
```

Update `packages/database/README.md`.


## Validation commands

Run:

```bash
pnpm install
pnpm workspace:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @infinicus/database test:integration
```

Apply all migrations from an empty PostgreSQL 16 database and rerun them to prove idempotency.

Do not use production credentials.

## Prohibited work

Do not implement Digital Twin, Simulation, ADI, ABA, OM, or CL schemas; frontend; relay; BI engine logic beyond persistence fixtures; vertical-slice consumers; external integrations; or edits to frozen migrations.

## Stop condition

Stop after the Business Intelligence schema, table groups, constraints, indexes, RLS, versioning, event functions, repositories, live tests, idempotency, documentation, and migration freeze are complete.

Do not begin Stage 2E.

## Completion report

Return:

```text
DATABASE STAGE 2D REPORT

Migration range:
- first
- last
- frozen status

Created:
- schema
- tables
- constraints
- foreign keys
- indexes
- RLS policies
- triggers
- event functions
- repositories
- tests
- documentation

Validation:
- migration apply
- migration idempotency
- structural tests
- repository tests
- RLS tests
- rollback tests
- build

Totals:
- tables
- constraints
- foreign keys
- indexes
- RLS tables
- triggers
- event functions
- repositories
- tests passing

Security:
- tenant isolation
- workspace isolation
- business isolation
- application-role RLS
- fail-closed behavior

Known limitations:
- exact limitation
- impact
- recommended follow-up

Next recommended task:
- Database Stage 2E — Business Digital Twin
```

