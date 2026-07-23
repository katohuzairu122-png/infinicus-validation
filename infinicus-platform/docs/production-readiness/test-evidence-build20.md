# BUILD-20 — Customer Decision Workflows: Test Evidence

All tests below were executed against a live local disposable PostgreSQL
16 instance (migrations `0001`–`0141` — this build added none). Every
number below is from an actual `vitest run`/`next build`/browser
execution, not asserted from code review.

## New test files (this build)

| File | Package | Kind | Result |
|---|---|---|---|
| `tests/DecisionWorkflowService.integration.test.ts` | `@infinicus/workflow` | Live integration | 12 passed, 1 skipped (guard) |
| `tests/context.test.ts` | `@infinicus/web` | Unit | 10 passed |

**Totals:** 10 pure unit tests, 12 live-database integration tests, 22
executed assertions across 2 new files, plus direct browser verification
(below) that this codebase's test suites have not previously required.

## Coverage by requirement (spec §6)

- **Unit tests**: `context.test.ts` covers `contextFromSearchParams`
  (present/missing/empty/array-valued params) and `ctxQuery`
  (serialization, round-trip, URL-encoding of reserved characters) — the
  two pure functions in `apps/web`.
- **Integration tests**: `DecisionWorkflowService.integration.test.ts`
  exercises business selection, the full aggregate `getWorkflowView`
  against a real BI→DT→Simulation→ADI pipeline fixture (built via the
  same proven fixture-chain pattern already used by
  `aba-repositories.integration.test.ts`/`om-repositories.integration.test.ts`
  in `@infinicus/database`), `getDecisionHistory`, and both human-decision
  writes end-to-end (`createReview`+`submitApprovalDecision` for both
  approve and reject outcomes; `recordOutcome` with measurements and
  evidence, confirming the resulting observation reaches `'recorded'`
  status).
- **Authorization and tenant-isolation tests**: two dedicated tests
  confirm tenant 2 cannot see tenant 1's business in `listBusinesses`,
  and that `getWorkflowView` rejects reading a different tenant's
  business entirely (RLS, not application-level filtering) — plus a
  `getDecisionHistory` test confirming a cross-tenant read returns empty
  lists rather than leaked data.
- **Failure-path tests**: covered indirectly through the six new
  additive repository read methods, which reuse the exact patterns
  already covered by each domain's own ≥100-test integration suite (BI,
  SIM, ADI, ABA, OM) — no new failure mode was introduced by this
  build's additive methods (plain `SELECT ... WHERE business_id = $1`,
  no new constraints or branching logic).
- **Idempotency tests where relevant**: not applicable — this build
  introduces no new idempotent-write surface; `submitApprovalDecision`/
  `recordOutcome` inherit their idempotency/immutability guarantees
  directly from `ApprovalDecisionRepository`/`OutcomeObservationRepository`,
  already tested in BUILD-15/16.
- **Migration tests**: not applicable — this build added no migrations.
  Frozen-migration byte-identity was re-verified (below).
- **Security tests**: the cross-tenant isolation tests above, plus a
  manual verification (documented in `security-controls-build20.md`)
  that the client bundle contains no server-only code or credentials.
- **Regression tests**: full existing `@infinicus/database` suite
  re-run unchanged (below).

## Full regression (this build's changes against every prior build)

```
packages/database: 23 test files, 2719 passed | 9 skipped (2728 total)
```

Every prior domain's suite (`da`, `bo`, `bi`, `dt`, `simulation`, `adi`,
`aba`, `om`, `cl`, `auth`, `onboarding`, plus all `migration-stage2*`
structural suites) passed unchanged — the six new additive read methods
did not alter any existing method's behavior.

## Static checks

```
pnpm typecheck   → 5/5 packages with a typecheck script pass (database, authentication, authorization, onboarding, workflow)
pnpm lint        → 23/23 packages pass (0 errors; 5 pre-existing console-statement
                    warnings in packages/database, unrelated to this build)
pnpm build       → 23/23 packages build successfully, including `next build`
                    for @infinicus/web (5 routes, ~103 kB shared First Load JS)
```

## Frozen-migration byte-identity

```
git diff --exit-code -- infinicus-platform/infrastructure/database/migrations/
→ exit 0 (clean — no migration files were touched by this build; still 0001-0141)
```

## Live browser verification (UI changes — required, not optional, per this session's standing instructions)

Ran `next dev`, seeded a real end-to-end BI→DT→Simulation→ADI→ABA→OM
fixture via the live repositories, and confirmed in an actual browser
(Playwright/Chromium):

- `/`, `/businesses` (with and without tenant context), `/businesses/{id}/workflow`,
  and `/businesses/{id}/history` all render with HTTP 200 and real data
  (screenshots taken and reviewed during this session).
- Clicking from the business list navigates correctly to the workflow
  page (not just direct-URL access).
- Accessibility landmarks are present and correctly labeled: one
  `<main id="main-content">`, one `<nav aria-label="Primary">`, a
  functioning skip-link, one `<h1>` per page, sensible `<h2>` section
  headings (7 on the workflow page, one per stage), and
  `aria-required="true"` on every required form field.
- The "Start a review and record a decision" form was submitted
  end-to-end through the real browser UI (a genuine `<form action={...}>`
  Server Action, not a mocked call) against a real ABA intake package id,
  and the page correctly reloaded showing the resulting `approved`
  decision status.

## Defects found and fixed during this build's own testing

1. **Pool-not-initialized error on some Next.js dev-mode routes.**
   `next dev` compiles each route as a separate on-demand bundle, which
   can produce multiple distinct module instances of `@infinicus/database`
   — a `globalThis`-cached boolean "already initialized" flag was true
   for the process while a given route's own copy of the module had
   never actually called `createPool()`, causing
   `Database pool not initialised` errors on `/businesses/{id}/workflow`
   and `/businesses/{id}/history`. Fixed by checking the actual
   module-scope state (`getPool()` succeeding or throwing) instead of a
   cached flag — self-healing per module instance, and still only calls
   `createPool()` once in a production build (one server bundle, one
   module instance). Documented as a code comment in `apps/web/lib/db.ts`.
2. **Test-fixture bugs (not service bugs)**, caught during the
   `@infinicus/workflow` live integration test's first run: an invalid
   `evidenceType` value (`'external'`, not in the `outcome_evidence`
   table's CHECK constraint — the valid values are
   `'execution_record'|'external_system'|'manual_entry'|'other'`), and a
   Digital Twin instance fixture never transitioned to `'active'` status
   (the schema default is `'initializing'`), so `getActiveForBusiness`
   correctly returned nothing. Both fixed in the test file; the
   underlying repositories were correct.
