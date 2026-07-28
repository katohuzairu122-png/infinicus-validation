# INFINICUS PHASE 21 — DECISION HISTORY AND EVIDENCE WORKSPACE MVP

## Objective

Build a read-only, tenant-scoped workspace that explains the complete lifecycle of every INFINICUS decision:

```text
Simulation evidence
→ ADI recommendation
→ ABA approval
→ execution
→ OM outcome
→ CL learning
```

Do not create new decision logic, execute actions, rerun simulations, or activate learning.

## Required users

- Business owner
- Manager
- Analyst
- Approver
- Auditor
- Platform administrator

## MVP capabilities

1. Decision list with filters, search, sorting, and pagination.
2. Decision detail page.
3. Simulation scenario and verdict-support summary.
4. Evidence, confidence, provenance, and limitations.
5. Recommended action and alternatives.
6. Approval route, decisions, and approvers.
7. Approved action and execution evidence.
8. Expected-versus-actual outcome history.
9. Learning candidates and publications.
10. Complete event, handoff, correlation, and causation lineage.
11. Authorized export.

## Target structure

```text
apps/web/src/features/decision-history/
├── api/
├── components/
├── pages/
├── hooks/
├── schemas/
└── index.ts

apps/api/src/modules/decision-history/
├── DecisionHistoryService.ts
├── DecisionHistoryRepository.ts
├── DecisionHistoryMapper.ts
├── DecisionHistoryPolicy.ts
├── routes.ts
├── schemas.ts
├── errors.ts
└── index.ts
```

## Canonical data sources

Read existing records only:

- Simulation results and scenarios
- ADI decision requests, evidence, candidates, recommendations
- ABA approval candidates, requests, decisions, actions, execution evidence
- OM monitoring plans and outcome records
- CL requests, candidates, publications, and feedback
- Event, handoff, and audit records

Do not create duplicate source-of-truth tables. A read model or materialized view is allowed only when measured performance requires it.

## API

```text
GET /api/decision-history
GET /api/decision-history/:decisionId
GET /api/decision-history/:decisionId/lineage
GET /api/decision-history/:decisionId/export
```

List filters:

- business
- recommendation type
- confidence range
- decision status
- approval status
- execution status
- outcome status
- date range
- text search

Default sort: newest generated decision first.

## Authorization

Required permissions:

```text
decision_history.read
decision_history.read_evidence
decision_history.read_audit
decision_history.export
```

Enforce tenant, workspace, business, role, and evidence classification.

## UI sections

```text
Overview
Simulation Evidence
Recommendation
Alternatives
Approval
Execution
Outcome
Learning
Event Lineage
Audit
Limitations
```

Lineage must show event type, producer, consumer, timestamp, status, correlation, causation, handoff, and attempt.

## Export

Support JSON and CSV summary. Add PDF only when an existing export service already exists.

Exports must exclude evidence the user cannot access.

## Performance targets

```text
List API p95 < 500 ms
Detail API p95 < 800 ms
Maximum page size 50
No N+1 queries
Bounded lineage query
```

## Security

- No cross-tenant or cross-workspace access.
- No mutation endpoints.
- No raw secrets.
- Parameterized SQL only.
- Separate export authorization.
- Restricted evidence remains protected.
- Frontend never connects directly to PostgreSQL.

## Tests

Backend:

- list, filters, search, sorting, pagination
- detail, lineage, export
- incomplete lifecycle records
- revoked or unavailable evidence
- role and evidence permissions
- tenant/workspace isolation
- parameterized queries
- query-count and performance checks

Frontend:

- list and detail rendering
- loading, empty, and error states
- filters and pagination
- restricted evidence
- lineage
- export
- accessibility
- responsive layout

End-to-end:

```text
Seed one complete decision lifecycle
→ open list
→ open detail
→ verify evidence, recommendation, approval, execution, outcome, learning, and lineage
→ export authorized summary
```

Target at least 80 meaningful tests.

## Documentation

Create:

```text
docs/product/decision-history-workspace.md
docs/product/decision-history-read-model.md
docs/product/decision-history-permissions.md
docs/product/decision-history-export.md
docs/product/decision-history-security.md
docs/product/decision-history-test-plan.md
```

## Validation

```bash
pnpm install
pnpm workspace:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run API integration tests against PostgreSQL 16.

## Stop condition

Stop when the read-only API, list/detail UI, lifecycle views, lineage, export, authorization, isolation tests, performance checks, and documentation pass.

Do not begin Phase 22.

## Completion report

Return exact files, endpoint results, UI coverage, permission results, performance measurements, test totals, unresolved risks, and:

```text
Next recommended task:
Phase 22 — Simulation Scenario Comparison
```
