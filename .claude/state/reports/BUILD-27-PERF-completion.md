BUILD-27 COMPLETION REPORT — PERFORMANCE AND LOAD READINESS

Build ID: BUILD-27
Layer: PERF
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-27-PERF-SPECIFICATION.md
Specification SHA-256: 0a23753101968a9102a3e7e0d018eec3a2104ab4b451589ee99942e0a4cc9c28
Status: COMPLETE

WHAT WAS BUILT

A dependency-free, fetch-based HTTP load generator (load-test.mjs) producing
real p50/p95/p99 latency and throughput against a live apps/api instance,
live-verified via a test that boots the real app with app.listen() and runs
the shipped script against it. A live database/domain concurrency test suite
covering: 50 concurrent database reads with a post-burst pool-idle check; 20
concurrent Simulation run requests/runs against the same scenario version; 20
concurrent ADI reasoning requests/runs against the same decision case; outbox
event-emission throughput; a 500-business large-tenant bulk-insert/listing
test; and connection-pool resilience under 5x oversubscription. A capacity
plan and proposed performance SLOs, both derived directly from this build's
own measured numbers (test-evidence-build27.md). Three genuine defects were
found and fixed during live testing (see "genuine bugs" below).

FILES CREATED

infrastructure/deployment/scripts/load-test.mjs
apps/api/tests/load-test.integration.test.ts
packages/database/tests/performance.integration.test.ts
infinicus-platform/docs/production-readiness/{architecture-and-scope,
  configuration,operating-procedure,security-controls,test-evidence,
  rollback-procedure,known-limitations}-build27.md

FILES MODIFIED

infrastructure/database/scripts/export-tenant.sh (fixed: RLS policies on the
  majority of tenant-scoped tables also require app.workspace_id, not just
  app.tenant_id — the script only ever set the latter, silently producing an
  incomplete export for every such table; now loops per-workspace)
infrastructure/database/scripts/delete-tenant-data.mjs (same workspace-
  scoping fix, plus: ~210 tables across every domain are deliberately
  append-only (forbid_mutation trigger) and previously crashed the script
  outright the first time one was hit for a tenant with real usage history;
  now skips them, attempts every other table's delete independently so one
  genuinely-blocked table doesn't roll back everything else, and reports a
  full retained/blocked breakdown in platform.data_deletion_events)
packages/database/tests/export-tenant.integration.test.ts (new regression
  case: a workspace-scoped table's row must appear in the export)
apps/api/tests/api.integration.test.ts (fixed a pre-existing, unrelated test
  fragility found during full regression — see VALIDATION)

ARCHITECTURE

No new services, packages, or database schema. load-test.mjs joins the
existing infrastructure/deployment/scripts/ CLI convention (argv/env-only,
no shell interpolation into eval strings). The two live test suites follow
the established describe.runIf(!!DATABASE_URL) guard pattern used by every
prior build. No later-build functionality added; no duplicated
infrastructure (connection pooling, RLS, outbox schema all reused unchanged).

SECURITY

See security-controls-build27.md. No new attack surface (load-test.mjs is
operational tooling, not deployed application code). Rate limiting verified
under genuine concurrent load for the first time (100/100 admitted, 200/200
correctly rejected in a 300-request burst at the default RATE_LIMIT_MAX=100).
Connection-pool exhaustion resilience verified (queues, does not crash or
leak). Two real defects in the right-to-erasure/data-export mechanism found
and fixed (workspace-scoping gap, append-only-table handling) without
loosening any BUILD-26 safety property (explicit tenant_id filtering,
RLS-exempt-role refusal, cross-tenant-safety test all preserved).

TENANCY AND AUTHORIZATION

Reused, not duplicated. This build's own defect-finding directly strengthens
tenancy guarantees: export-tenant.sh and delete-tenant-data.mjs were
previously silently incomplete for ~300 of 442 tenant-scoped tables (any
table whose RLS requires workspace_id in addition to tenant_id) — a real gap
in both BUILD-22's data-portability and BUILD-26's right-to-erasure
deliverables, undetected until this build's own fixture cleanup surfaced it
live. Both scripts are fixed and re-verified; delete-tenant-data.mjs's
existing cross-tenant-safety regression test continues to pass.

DATABASE CHANGES

None. No migration added or modified. No schema, index, or RLS policy
touched (the append-only triggers this build's fix respects already existed
from each domain's original migrations).

API CHANGES

None. No new routes, no schema changes.

UI CHANGES

None.

CONFIGURATION

No new production runtime environment variables. load-test.mjs reads
BASE_URL (required), CONCURRENCY, REQUESTS, LOAD_TEST_HEADERS (all optional,
operational-script-only). Existing RATE_LIMIT_MAX/DATABASE_URL/
ADMIN_DATABASE_URL exercised, not changed.

OBSERVABILITY

No changes. This build's own console.log('[PERF] ...') output in the live
test suites is the observability surface for this build's measurements
themselves (read directly, not persisted).

TESTS

9 new/modified live-database-backed tests across two new test files
(load-test.integration.test.ts, performance.integration.test.ts), plus one
new regression case in export-tenant.integration.test.ts and one fragility
fix in api.integration.test.ts. Genuine live drills: load-test.mjs run at
three concurrency levels against a live app.listen() instance (both raised-
and default-rate-limit configurations); delete-tenant-data.mjs re-run
against a real, long-lived test tenant with genuine ADI usage history
(surfaced the append-only-table defect); export-tenant.sh re-run against a
fixture tenant with a workspace-scoped row (confirmed the fix). Idempotency
of performance.integration.test.ts's fixture setup verified across 3
consecutive live runs.

VALIDATION

pnpm turbo run build: 23/23 tasks successful.
pnpm turbo run lint: 49/49 tasks successful, 0 errors (5 pre-existing
  unrelated console-statement warnings).
pnpm turbo run typecheck: 0 errors (included in build/lint tasks above).
Full regression: packages/database 38 test files, 2792 passed | 23 skipped
  (0 failed); apps/api 8 test files, 45 passed | 8 skipped (0 failed).
One pre-existing regression found and fixed during this run (not introduced
  by BUILD-27, and previously flagged as flaky in BUILD-25's own completion
  report): api.integration.test.ts's paginated-listing test assumed the
  newly created business always lands on page 1 of a fixed, long-lived
  shared test tenant reused by every test in the file across the session's
  history; after enough accumulated fixture data this assumption broke.
  Fixed to page-walk until found — still exercises the real endpoint,
  no longer fragile to prior fixture volume.

ROLLBACK

Plain git revert of this commit. No migration to roll back. No production
runtime code path affected — the two fixed scripts are invoked manually/
operationally, not part of the running apps/api process. Full detail in
rollback-procedure-build27.md.

REGRESSION RESULTS

All prior domains pass unchanged. No frozen migration touched. The one
pre-existing test-fragility issue found (see VALIDATION) was fixed, not
merely observed passing by luck.

OUT-OF-SCOPE CONFIRMATION

No distributed/multi-node load testing (single-process, single-database
environment). No load testing of full cross-layer workflow chains under
concurrency (each domain's request/run-creation step measured in isolation,
consistent with the established shallow-fixture-chain pattern). Wiring
outbox emission into domain write paths not attempted (a cross-cutting
change, tracked as a known limitation for a future build). Building an
anonymization capability for append-only audit-trail tables not attempted
(a data-governance design decision, tracked as a known limitation). No
later-build functionality (BUILD-28 billing, BUILD-29 incident response,
BUILD-30 launch) begun.

KNOWN LIMITATIONS

See known-limitations-build27.md: outbox emission is not wired into any
domain write path anywhere in the monorepo (a genuine, previously-
undiscovered gap, found while building this build's own outbox-throughput
test); right-to-erasure cannot fully erase a tenant with real audit-trail
history in append-only tables (an unresolved tension between audit
integrity and literal GDPR Article 17 erasure, requiring a future
anonymization-design decision); this build's measured numbers reflect one
shared, sandboxed development environment, not dedicated production
hardware; no distributed load testing; no end-to-end cross-layer workflow
load testing; load-test.mjs uses Node's built-in fetch rather than a
dedicated external load-testing tool.

QUEUE TRANSITION

BUILD-27: ready -> in_progress -> completed.
Per the user's explicit "continue to full completion of all the builds (30)"
instruction, BUILD-28 is being readied and started immediately following
this report.

Commit: (this commit)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10
Next build: BUILD-28 (BILLING)
