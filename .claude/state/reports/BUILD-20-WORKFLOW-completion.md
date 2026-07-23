BUILD-20 COMPLETION REPORT — CUSTOMER DECISION WORKFLOWS

Build ID: BUILD-20
Layer: WORKFLOW
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-20-WORKFLOW-SPECIFICATION.md
Specification SHA-256: 089785c7a260609b7be9976e7505f79d02bac28ec9a34535733fd569017f8770
Status: COMPLETE

WHAT WAS BUILT

A usable, responsive, accessible UI (Next.js 15, App Router) letting a
human walk a business through one decision cycle: select the business,
review its data, see BI evidence, Digital Twin state, Simulation
execution results, and the ADI recommendation, run an ABA review and
record an approve/reject decision, enter an outcome, and view decision
history — composing the already-built BI/DT/Simulation/ADI/ABA/OM
persistence layers via a new packages/workflow orchestration package,
without duplicating any of their logic or modifying any migration. Six
minimal, additive read methods were added to existing repositories
where a "list by business" query was genuinely missing. The Next.js
framework choice (gated behind "only if instructed later" in root
CLAUDE.md) was confirmed directly with the user before any UI code was
written.

FILES CREATED

infinicus-platform/packages/database/src/repositories/onboarding/BusinessRepository.ts (listForWorkspace added)
infinicus-platform/packages/workflow/package.json
infinicus-platform/packages/workflow/tsconfig.json
infinicus-platform/packages/workflow/src/DecisionWorkflowService.ts
infinicus-platform/packages/workflow/src/index.ts
infinicus-platform/packages/workflow/tests/DecisionWorkflowService.integration.test.ts
infinicus-platform/apps/web/next.config.mjs
infinicus-platform/apps/web/app/layout.tsx
infinicus-platform/apps/web/app/page.tsx
infinicus-platform/apps/web/app/globals.css
infinicus-platform/apps/web/app/businesses/page.tsx
infinicus-platform/apps/web/app/businesses/[businessId]/workflow/page.tsx
infinicus-platform/apps/web/app/businesses/[businessId]/workflow/actions.ts
infinicus-platform/apps/web/app/businesses/[businessId]/history/page.tsx
infinicus-platform/apps/web/lib/db.ts
infinicus-platform/apps/web/lib/context.ts
infinicus-platform/apps/web/tests/context.test.ts
infinicus-platform/docs/production-readiness/architecture-and-scope-build20.md
infinicus-platform/docs/production-readiness/configuration-build20.md
infinicus-platform/docs/production-readiness/operating-procedure-build20.md
infinicus-platform/docs/production-readiness/security-controls-build20.md
infinicus-platform/docs/production-readiness/test-evidence-build20.md
infinicus-platform/docs/production-readiness/rollback-procedure-build20.md
infinicus-platform/docs/production-readiness/known-limitations-build20.md

FILES MODIFIED

infinicus-platform/packages/database/src/repositories/bi/InsightPackageRepository.ts (listForBusiness added)
infinicus-platform/packages/database/src/repositories/simulation/SimulationRunRepository.ts (listForBusiness added)
infinicus-platform/packages/database/src/repositories/adi/DecisionCaseRepository.ts (listForBusiness added)
infinicus-platform/packages/database/src/repositories/approved_action/ActionReviewRepository.ts (listForBusiness added)
infinicus-platform/packages/database/src/repositories/om/OutcomeObservationRepository.ts (listForBusiness added)
infinicus-platform/apps/web/package.json (rewritten: Next.js app instead of TS placeholder)
infinicus-platform/apps/web/tsconfig.json (rewritten: Next.js App Router config)
infinicus-platform/turbo.json (added @infinicus/web#build task override for .next/ output)
infinicus-platform/.gitignore (added .next/, next-env.d.ts)
infinicus-platform/apps/web/src/index.ts (deleted — replaced by app/ directory)

ARCHITECTURE

Nine-layer authority model preserved — this build adds a cross-cutting
review/decision UI, not a tenth layer. Reuses the frozen BI/DT/SIM/ADI/
ABA/OM schema and repositories verbatim; the only new persistence-layer
surface is six additive read methods (plain SELECT ... WHERE
business_id = $1 against already-indexed columns, no schema change).
Per AD-021, DecisionWorkflowService never decides anything itself — it
only forwards a human's explicit approve/reject/outcome choice to the
repository that already owns that decision's persistence and
immutability rules. Full detail:
docs/production-readiness/architecture-and-scope-build20.md.

SECURITY

Server-side enforcement only (Next.js Server Components/Server Actions;
no database access from client-side JavaScript). RLS-enforced tenant
isolation fully inherited, unchanged, live-tested including cross-tenant
denial. Fail-closed, never-decides orchestration (AD-021). A documented
placeholder (tenant context via visible query parameters, since no
login UI exists yet) is clearly labeled as non-production in both the
UI itself and the docs — flagged as the most important follow-up item.
Full detail: docs/production-readiness/security-controls-build20.md.

TENANCY AND AUTHORIZATION

No new RLS policy — every read and write in this build runs through
withTenantTransaction(ctx, ...) in an existing, already-tested
repository. Cross-tenant isolation live-tested: tenant 2 cannot see
tenant 1's businesses, cannot read tenant 1's workflow view, and
getDecisionHistory returns empty (not tenant-1 data) when queried
across tenants.

DATABASE CHANGES

None. Zero migrations. Six additive read methods on five existing
repositories plus one onboarding-domain repository, all reusing
already-existing indexed columns. Migrations 0001-0141 verified
byte-identical via `git diff --exit-code` (untouched — same range as
BUILD-19).

API CHANGES

None in the traditional REST/GraphQL sense — still no HTTP framework
chosen for apps/api (deferred per root CLAUDE.md §4, same boundary as
BUILD-18/19). This build's "API" surface is Next.js Server
Components/Server Actions within apps/web itself.

UI CHANGES

New: /businesses (business selection), /businesses/{id}/workflow
(aggregate decision-workflow view with ABA-review and outcome-entry
forms), /businesses/{id}/history (per-stage decision history). Built
with Next.js 15 App Router, React 19, hand-written responsive/accessible
CSS (no design-system dependency). Verified directly in a browser
(Playwright/Chromium) per this session's standing UI-verification
requirement: all five routes render 200 with real data from a live
end-to-end BI->DT->Simulation->ADI->ABA->OM fixture, navigation via
click-through works, accessibility landmarks and required-field
attributes are present, and the ABA approval form was submitted
end-to-end through the real browser UI with the resulting decision
status correctly reflected after reload.

CONFIGURATION

One environment variable, DATABASE_URL, reused unchanged from every
prior build. New packages/workflow package added (mirrors
packages/onboarding's shape). apps/web rewritten from a bare TypeScript
placeholder into a real Next.js application; its tsconfig.json
intentionally does not extend the shared tsconfig.base.json (Next.js's
bundler-driven module resolution is incompatible with the base config's
module: Node16 setting) — documented as the one deliberate divergence
from the monorepo's shared TypeScript config. Full detail:
docs/production-readiness/configuration-build20.md.

OBSERVABILITY

No new events or outbox tables — every write this build triggers goes
through the domain repository that already owns event emission for
that stage (ApprovalDecisionRepository's / OutcomeObservationRepository's
existing approved_business_action / outcome_monitoring triggers).

TESTS

2 new test files: 10 unit tests (context.test.ts, pure functions in
apps/web) + 12 live-PostgreSQL integration tests
(DecisionWorkflowService.integration.test.ts, exercising the full
aggregate workflow view against a real multi-domain fixture chain, both
human-decision writes for all three approval outcomes, decision
history, and cross-tenant isolation). All passing. Plus direct browser
verification (screenshots and end-to-end form submission) documented in
test-evidence-build20.md — this build is the first in the sequence with
a real UI, so browser verification was performed per this session's
standing instructions for UI/frontend changes.

VALIDATION

pnpm typecheck: 5/5 packages with a typecheck script pass (database,
authentication, authorization, onboarding, workflow).
pnpm lint: 23/23 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database).
pnpm build: 23/23 packages build successfully, including `next build`
for @infinicus/web (5 routes, ~103 kB shared First Load JS, verified
after fixing the turbo.json output-path mismatch).
Frozen-migration byte-identity: `git diff --exit-code` on
infrastructure/database/migrations/ — clean, no files touched.
Live browser verification: all 5 routes render correctly with real
data; navigation and form submission both verified end-to-end.

ROLLBACK

Zero migrations to roll back. Application-code rollback is a plain
commit revert with no data migration required — packages/workflow is a
new, independently removable package; the six additive repository
methods are purely additive and safe to remove; apps/web reverts to its
prior bare-placeholder state. Full procedure:
docs/production-readiness/rollback-procedure-build20.md.

REGRESSION RESULTS

packages/database: 23 test files, 2719 passed | 9 skipped (2728 total)
— every prior domain (da, bo, bi, dt, simulation, adi, aba, om, cl,
auth, onboarding, plus all migration-stage2* structural suites) passed
unchanged.
packages/workflow: 1 test file, 12 passed | 1 skipped (13 total).
apps/web: 1 test file, 10 passed (10 total).

OUT-OF-SCOPE CONFIRMATION

No authentication/session UI (tenant context via visible query
parameters, clearly labeled as a placeholder — flagged as the top
follow-up item). No in-UI discovery of "what's pending review" (ids are
pasted in directly). No triggering of a new simulation run, DT snapshot,
or ADI recommendation from this UI (those remain each layer's own
pipeline responsibility). No single interleaved cross-stage decision
timeline (per-stage lists only). No approver-assignment management UI.
No client-side JavaScript framework beyond native Next.js Server
Actions/forms. No design-system dependency. No later-build functionality
(workflow *engine*, billing, etc.) was implemented. No frozen migration
(0001-0141) or existing repository/table from any prior build was
modified.

KNOWN LIMITATIONS

Full detail in docs/production-readiness/known-limitations-build20.md.
Summary: no authentication UI (the most important gap, not introduced
by this build), no pending-review discovery list, this UI reviews and
decides but does not trigger simulation/DT/ADI generation, decision
history is per-stage not one merged timeline (no repository currently
exposes a directly comparable cross-domain timestamp), no
approver-assignment management UI, no client-side interactivity beyond
native forms, and styling is hand-written CSS rather than an adopted
design system.

QUEUE TRANSITION

BUILD-20: pending -> ready -> in_progress -> completed. currentReadyBuild
remains null — BUILD-21 was not readied or started, per explicit
instruction (spec §8, §10).

Commit: (see next commit in this branch)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10 (tracking PR for this branch) — to be updated with this build's summary.
Next build: BUILD-21 (API). Not readied. Per BUILD-20 specification
§8/§10, a future session must explicitly re-verify BUILD-21's
preconditions against
docs/implementation-queue/BUILD-21-API-SPECIFICATION.md and the current
repository state before marking it ready.
