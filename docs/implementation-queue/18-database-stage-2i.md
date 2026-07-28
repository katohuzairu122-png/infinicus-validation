# INFINICUS DATABASE STAGE 2I — OUTCOME MONITORING IMPLEMENTATION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

This prompt is implementation-ready. Do not redesign. Inspect, align, implement, validate, freeze, and report.

Read Stages 2A–2H completion reports, frozen migration manifest, OM blocks OM-01 through OM-25, Event Catalogue, Handoff Contracts, and existing database conventions.

## Objective

Implement Database Stage 2I only:

```text
Outcome Monitoring persistence
```

Canonical schema:

```text
outcome_monitoring
```

Use the next actual migration number after Stage 2H.

## Required table groups

### Monitoring intake

```text
monitoring_intake_packages
monitoring_intake_package_versions
monitoring_intake_items
monitoring_intake_lineage
monitoring_intake_status_history
```

### Monitoring plans

```text
monitoring_plans
monitoring_plan_versions
monitoring_plan_metrics
monitoring_plan_windows
monitoring_plan_thresholds
monitoring_plan_alert_rules
monitoring_plan_assignments
```

### Baselines and expected outcomes

```text
monitoring_baselines
monitoring_baseline_versions
expected_outcomes
expected_outcome_versions
expected_outcome_metrics
expected_outcome_intervals
```

### Observations

```text
outcome_observations
outcome_observation_values
outcome_observation_evidence
outcome_observation_quality
outcome_observation_lineage
```

### Variance and attribution

```text
outcome_variance_runs
outcome_variance_results
outcome_attribution_runs
outcome_attribution_factors
outcome_attribution_results
outcome_attribution_limitations
```

### Alerts and incidents

```text
outcome_alerts
outcome_alert_status_history
outcome_alert_evidence
outcome_monitoring_incidents
outcome_incident_actions
```

### Outcome records

```text
outcome_records
outcome_record_versions
outcome_record_metrics
outcome_record_evidence
outcome_record_limitations
outcome_record_status_history
```

Statuses:

```text
collecting
provisional
validated
finalized
superseded
revoked
```

### Comparisons and effectiveness

```text
expected_actual_comparisons
action_effectiveness_records
decision_effectiveness_records
monitoring_confidence_records
monitoring_quality_records
```

### Publication and learning handoff

```text
outcome_publication_packages
outcome_publication_package_versions
outcome_publication_items
outcome_handoff_receipts
outcome_handoff_acknowledgements
outcome_handoff_rejections
```

Target:

```text
continuous_learning
```

### Registry, deployment, rollback

```text
monitoring_component_registry
monitoring_component_versions
monitoring_deployments
monitoring_rollbacks
```

## Core rules

- Monitoring starts only from authorized action evidence or approved plan.
- Baselines and expected outcomes are versioned.
- Raw observations remain traceable.
- Variance and attribution are distinct.
- Attribution must preserve limitations and confidence.
- Finalized outcomes are immutable.
- Alerts do not automatically change policy or learning.
- Publication to CL contains evidence, limitations, and provenance.
- Revoked action or monitoring package must be handled explicitly.

## Suggested migration grouping

```text
<next>_outcome_monitoring_schema.sql
<next+1>_om_intake_plans.sql
<next+2>_om_baselines_expected_outcomes.sql
<next+3>_om_observations.sql
<next+4>_om_variance_attribution.sql
<next+5>_om_alerts_incidents.sql
<next+6>_om_outcome_records.sql
<next+7>_om_effectiveness_confidence_quality.sql
<next+8>_om_publication_handoffs.sql
<next+9>_om_registry_deployment.sql
<next+10>_om_indexes.sql
<next+11>_om_rls.sql
<next+12>_om_triggers.sql
<next+13>_om_event_functions.sql
```

## Constraints

Enforce valid states, versions, time windows, score ranges, expected intervals, metric compatibility, unique active plan versions, unique baseline versions, unique observation idempotency, unique outcome versions, valid target layer, and valid alert transitions.

## RLS

Enable RLS on every tenant-owned table. Enforce tenant, workspace, and business scope. Missing context fails closed.

## Immutability

Immutable after validation/finalization/publication:

```text
baselines used by plans
expected outcome versions
observations and evidence
variance results
attribution results
finalized outcomes
publication packages
handoff acknowledgements
deployment evidence
```

## Event functions

Create canonical equivalents of:

```text
om.monitoring.started
om.observation.recorded
om.alert.triggered
om.outcome.recorded
om.outcome.published
```

Reuse canonical outbox and preserve lineage.

## Repositories

Implement at minimum:

```text
MonitoringIntakeRepository
MonitoringPlanRepository
MonitoringBaselineRepository
ExpectedOutcomeRepository
OutcomeObservationRepository
OutcomeVarianceRepository
OutcomeAttributionRepository
OutcomeAlertRepository
OutcomeRecordRepository
OutcomePublicationRepository
OutcomeHandoffRepository
MonitoringDeploymentRepository
```

## Live PostgreSQL 16 tests

Cover:

- intake and lineage;
- plan versioning, windows, thresholds, alerts;
- baselines and expected outcomes;
- observations, evidence, quality, idempotency;
- variance calculations persistence;
- attribution factors, confidence, limitations;
- alerts and incidents;
- outcome lifecycle and immutability;
- expected-vs-actual and effectiveness records;
- publication and CL handoff;
- event outbox atomicity;
- RLS and rollback;
- registry/deployment.

Target at least 120 meaningful live integration tests.

## Documentation

Create:

```text
docs/database/stage-2i-outcome-monitoring.md
docs/database/om-schema.md
docs/database/om-baselines-expected-outcomes.md
docs/database/om-observations-lineage.md
docs/database/om-variance-attribution.md
docs/database/om-events.md
docs/database/om-repositories.md
docs/database/om-rls.md
docs/database/om-test-plan.md
```

## Validation

Run standard workspace, lint, typecheck, test, build, and PostgreSQL integration commands. Apply all migrations from empty PostgreSQL 16 and rerun for idempotency.

## Prohibited work

Do not implement CL schema, frontend, autonomous learning, event relay, external monitoring adapters, or edits to frozen migrations.

## Stop condition

Stop after monitoring intake, plans, baselines, observations, variance, attribution, alerts, outcomes, publication, RLS, events, repositories, tests, idempotency, documentation, and migration freeze are complete.

Do not begin Stage 2J.

## Completion report

Return exact migration range, totals, outcome lineage, attribution limits, RLS, validation, limitations, and:

```text
Next recommended task:
Database Stage 2J — Continuous Learning
```
