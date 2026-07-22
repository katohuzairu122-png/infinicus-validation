# INFINICUS Architecture Decision Ledger

## Purpose

This ledger records frozen architectural decisions that later Claude sessions must treat as constraints unless a new approved decision explicitly supersedes them.

## Core platform decisions

### AD-001 — Nine-layer architecture

INFINICUS uses these layers:

1. Data Acquisition
2. Business Operations
3. Business Intelligence
4. Business Digital Twin
5. Simulation
6. AI Decision Intelligence
7. Approved Business Action
8. Outcome Monitoring
9. Continuous Learning

### AD-002 — Browser and persistence tracks are distinct

The browser root-block/bundle track and the PostgreSQL persistence track are related but separate.

A browser bundle being complete does not imply that its database persistence stage exists.

### AD-003 — Layer authority boundaries

- Data Acquisition collects, validates, cleans, normalizes, and publishes governed data.
- Business Operations represents operational business activity and state.
- Business Intelligence calculates metrics, findings, forecasts, anomalies, benchmarks, and risk intelligence.
- Business Digital Twin represents versioned business state.
- Simulation estimates probabilistic outcomes and scenarios.
- AI Decision Intelligence recommends and explains.
- Approved Business Action approves, modifies, rejects, and governs action release.
- Outcome Monitoring records and evaluates actual outcomes.
- Continuous Learning derives governed lessons and improvement proposals.

### AD-004 — Simulation is not recommendation authority

Simulation may generate probabilistic outcomes, risk distributions, sensitivity, survival estimates, and scenario evidence.

Simulation must not recommend, approve, or execute business actions.

### AD-005 — ADI is not approval or execution authority

ADI may generate recommendations, alternatives, expected outcomes, risks, confidence, implementation steps, limitations, and monitoring requirements.

ADI must not approve or execute its own recommendation.

### AD-006 — ABA is approval authority

ABA records explicit approval, approval with modifications, rejection, holds, releases, and governance evidence.

Approval is distinct from external action execution.

### AD-007 — OM cannot rewrite historical decisions

Outcome Monitoring records observed outcomes and compares them with expected outcomes.

It must not mutate historical BI findings, DT snapshots, Simulation evidence, ADI decisions, or ABA approvals.

### AD-008 — CL cannot silently rewrite history

Continuous Learning may create lessons, detect patterns, evaluate models and policies, and propose improvements.

Any change requires versioning, evidence, review, approval, release, and rollback. Frozen historical records remain immutable.

## Database decisions

### AD-009 — Ordered migration stages

Database stages are ordered:

- Stage 1 — Foundation
- Stage 2A — Shared Persistence Foundation
- Stage 2B — Data Acquisition
- Stage 2C — Business Operations
- Stage 2D — Business Intelligence
- Stage 2E — Business Digital Twin
- Stage 2F — Simulation
- Stage 2G — AI Decision Intelligence
- Stage 2H — Approved Business Action
- Stage 2I — Outcome Monitoring
- Stage 2J — Continuous Learning

Migration numbers must be discovered from the repository and never guessed.

### AD-010 — Frozen migrations are immutable

Previously completed migrations must remain byte-identical.

Any new change must use a new migration.

### AD-011 — Tenant isolation is fail-closed

Tenant-scoped persistence must validate tenant, workspace, and business context where applicable.

Missing context returns no rows or rejects the write.

Cross-tenant, cross-workspace, and business-scope access must fail.

### AD-012 — FORCE RLS is the strengthened convention

Stage 2D established:

```sql
ENABLE ROW LEVEL SECURITY;
FORCE ROW LEVEL SECURITY;
```

Stages 2E–2J must follow this convention unless an approved exception is documented.

### AD-013 — Historical evidence is append-only

Evidence, status history, completed results, observations, audit records, publication events, deployments, and rollback records are append-only.

Published or historical records are superseded by new versions rather than mutated.

### AD-014 — Atomic outbox

Domain state changes and outbox events must use the same transaction client and commit atomically.

Nested transactions are prohibited.

### AD-015 — No external broker before justified scale

The current architecture uses the canonical repository outbox and in-process/database-backed conventions.

Kafka, RabbitMQ, SNS/SQS, Pub/Sub, and other external brokers are out of scope unless a future approved build proves they are necessary.

## Contract decisions

### AD-016 — Handoffs are strict and versioned

Every layer handoff must define:

- producer and consumer;
- contract version;
- ownership;
- correlation and causation;
- source artifact IDs;
- status eligibility;
- evidence and lineage;
- serialization and size limits;
- secret and credential rejection;
- controlled validation errors.

### AD-017 — Transport acknowledgement is not business acceptance

Delivery, receipt, acknowledgement, rejection, approval, and execution are distinct lifecycle concepts.

### AD-018 — Consumers cannot republish producer-owned event types

Each canonical event type has one authoritative producer.

Consumers may emit their own resulting events but must not impersonate the original producer.

## Browser decisions

### AD-019 — Existing browser APIs remain compatible

Completed browser namespaces and public APIs must not be renamed without a compatibility layer and explicit specification.

### AD-020 — Engine v3 behavior is preserved

The existing Monte Carlo engine must preserve:

- 500-run behavior;
- 90-day default horizon;
- existing input normalization;
- existing result parity;
- Simulation-to-ADI compatibility.

### AD-021 — Platform orchestration does not create business authority

`window.INFINICUS.PLATFORM` may validate, initialize, sequence, diagnose, and orchestrate.

It must not make business decisions.

## Security decisions

### AD-022 — No secrets in events or diagnostics

Events, logs, diagnostics, audit records, and handoff payloads must not contain raw credentials, tokens, passwords, API keys, or secret material.

### AD-023 — No unsafe executable payloads

Reject functions, symbols, BigInt, DOM nodes, global references, class instances, cyclic structures, prototype-pollution keys, and executable content.

### AD-024 — Controlled and redacted errors

Errors must use controlled codes and redact sensitive payload content.

## Build-process decisions

### AD-025 — Specification before implementation

Every build follows:

```text
author specification
→ freeze and checksum
→ mark ready
→ implement
→ validate
→ completion report
→ queue transition
```

### AD-026 — One build scope at a time

Claude must not silently start later builds, combine unrelated layers, or implement out-of-scope work.

### AD-027 — Repository is the source of truth

Specifications must inspect actual files, exports, scripts, migrations, tests, and conventions before freezing exact implementation instructions.
