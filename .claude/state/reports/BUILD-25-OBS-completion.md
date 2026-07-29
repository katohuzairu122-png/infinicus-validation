BUILD-25 COMPLETION REPORT — LOGGING MONITORING AND ALERTING

Build ID: BUILD-25
Layer: OBS
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-25-OBS-SPECIFICATION.md
Specification SHA-256: 4efec667549008fc07c5a6b433e4ef02601068c363d103c02d87fcbb80373954
Status: COMPLETE

WHAT WAS BUILT

Error tracking (ErrorTracker interface + LoggingErrorTracker/
CompositeErrorTracker, observability.error_events table + repository,
wired into apps/api's central error handler so every unhandled error is
persisted, redacted). Lightweight in-process distributed tracing
(startSpan(), trace/parent propagation, logged as structured events).
Job/outbox monitoring (getOutboxBacklog() over the pre-existing
events.outbox_events table). Database monitoring (GET /v1/metrics reuses
BUILD-22's poolStats()). Alerting (observability.alert_events table +
repository + observability-audit.cjs's threshold-check/trigger/resolve
commands). A real, platform:admin-gated dashboards-data endpoint
(GET /v1/metrics). An honest SLO-reporting summary that computes real
counts without fabricating an availability percentage it has no
request-volume denominator for.

FILES CREATED

packages/observability/src/logger.ts (moved out of index.ts, no
  behavior change — breaks a circular import with errorTracking.ts/
  tracing.ts)
packages/observability/src/errorTracking.ts
packages/observability/src/tracing.ts
packages/observability/tests/errorTracking.test.ts
packages/observability/tests/tracing.test.ts
packages/database/src/repositories/observability/{errors,
  ErrorEventRepository,AlertEventRepository,outboxMonitor,index}.ts
packages/database/tests/error-events.integration.test.ts
packages/database/tests/alert-events.integration.test.ts
packages/database/tests/observability-audit-cli.integration.test.ts
apps/api/src/routes/observability.ts
apps/api/src/schemas/observability.ts
apps/api/tests/observability.integration.test.ts
infrastructure/database/migrations/0148_create_observability_schema.sql
infrastructure/deployment/scripts/observability-audit.cjs
infinicus-platform/docs/production-readiness/{architecture-and-scope,
  configuration,operating-procedure,security-controls,test-evidence,
  rollback-procedure,known-limitations}-build25.md

FILES MODIFIED

packages/observability/src/index.ts (rewritten as a barrel over
  logger.ts/errorTracking.ts/tracing.ts; no existing export's behavior
  changed)
packages/database/src/index.ts (BUILD-25 export section added)
apps/api/src/plugins/errorHandler.ts (unhandled-error branch gains
  fire-and-forget, redacted persistence to ErrorEventRepository; the
  existing response behavior is unchanged)
apps/api/src/app.ts (one new route registration)

ARCHITECTURE

repositories/observability/ mirrors BUILD-23/24's repository patterns
exactly: ErrorEventRepository follows AccessEventRepository's
tenant-nullable-RLS pattern (BUILD-18); AlertEventRepository follows
DeploymentEventRepository's platform-scoped-no-RLS pattern (BUILD-23).
observability-audit.cjs mirrors deployment-audit.cjs/
secret-rotation-audit.cjs's argv-only CLI pattern. GET /v1/metrics
reuses the existing authenticate/resolveTenantContext/requirePermission
chain rather than inventing a separate platform-level auth path. No
later-build functionality added; no duplicated infrastructure
(structured logging, health/readiness endpoints, connection pooling all
reused unchanged).

SECURITY

Every persisted error is redacted via @infinicus/configuration's
redactSecretValues() before it reaches the database — defense-in-depth
against a driver-level error embedding a raw credential. Default log
redaction (BUILD-24) applies unchanged to the new trace/errorTracking
log shapes. Error persistence is fire-and-forget and independently
caught — never blocks or crashes the actual error response. GET
/v1/metrics is gated behind platform:admin, live-verified (401
unauthenticated, 403 member-role, 200 owner-role).

TENANCY AND AUTHORIZATION

observability.error_events has RLS (tenant-nullable, enabled and
forced), matching audit.access_events. observability.alert_events is
platform-scoped (no tenant_id/RLS), matching platform.deployment_events/
secret_rotation_events. GET /v1/metrics requires platform:admin,
live-verified against both a denied (member) and an allowed (owner)
caller.

DATABASE CHANGES

One migration: 0148_create_observability_schema.sql. New observability
schema with error_events (RLS, tenant-nullable) and alert_events
(platform-scoped, no RLS). Two indexes. No existing table, schema, or
migration touched.

API CHANGES

New route: GET /v1/metrics (platform:admin-gated). Extended
apps/api's central error handler to persist unhandled errors — no
existing route's request/response contract changed.

UI CHANGES

None.

CONFIGURATION

No new environment variables — DATABASE_URL/ADMIN_DATABASE_URL (BUILD-24's
inventory) are the only credentials this build's tooling needs.

OBSERVABILITY

This build IS the observability layer. See WHAT WAS BUILT above.

TESTS

37 new tests across 6 new test files (see test-evidence-build25.md for
per-file breakdown), plus genuine live drills: real outbox-backlog data
(2153 pending events accumulated across this session, RLS-scoped vs.
admin-scoped visibility both confirmed), real error-rate checking,
alert trigger/resolve lifecycle, the full GET /v1/metrics auth chain
(401/403/200), and confirmed error-handler persistence for a
deliberately-thrown unhandled error.

VALIDATION

pnpm typecheck: 26/26 tasks pass.
pnpm lint: 23/23 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database).
pnpm build: 23/23 packages build successfully.
Frozen-migration byte-identity: git status --porcelain on
infrastructure/database/migrations/ — only 0148 new.
Empty-database install: migration 0148 applied cleanly to the local dev
database (continuing from the 0147 baseline); observability.error_events/
alert_events verified present with their indexes/RLS.
Migration idempotency: re-ran migration-gate.sh — 0148 reported skip.
Full regression: packages/database 2784 passed | 21 skipped (36 files) ·
configuration 31 · observability 18 · authentication 45|1 skip ·
authorization 25|1 skip · onboarding 12|1 skip · workflow 12|1 skip ·
web 14 · api 36|5 skip (one pre-existing, non-regression test failure in
apps/api/tests/api.integration.test.ts — a BUILD-21 test whose hardcoded
shared tenant fixture has accumulated 104+ business rows across this
session's exceptionally long history of repeated test runs, exceeding
its route's default page size; confirmed deterministic via row count and
isolated re-run, confirmed impossible in CI which always provisions a
fresh empty database; not modified, out of this build's scope — full
detail in test-evidence-build25.md).

A genuine bug was found and fixed via this build's own live testing:
ErrorEventRepository.countSince()/getOutboxBacklog() initially failed
with "invalid input syntax for type uuid: ''" through GET /v1/metrics —
the exact class of bug BUILD-19 already discovered (a Postgres session
variable set via SET LOCAL on a pooled connection reverts to an empty
string, not NULL, once that transaction commits). Fixed by applying
BUILD-19's own nil-UUID sentinel pattern to every affected method;
re-verified, all green.

ROLLBACK

One migration to roll back via a documented DROP TABLE/DROP SCHEMA/
DELETE FROM _migrations transaction. Application-code rollback is a
plain commit revert — every change in this build is additive. Resolving
an alert has no "un-resolve" path (a closed historical fact, matching
every other append-style event table in this platform) — documented,
not a gap.

REGRESSION RESULTS

All prior domains pass unchanged. No frozen migration touched. The one
pre-existing test failure described above is a long-lived-local-database
artifact unrelated to this build's code, not a regression it introduced.

OUT-OF-SCOPE CONFIRMATION

No real APM/tracing backend integrated (none reachable from this
environment — ErrorTracker/startSpan() are the documented seams). No
real dashboard UI (GET /v1/metrics is the data source a future one would
consume). No fabricated SLO percentage (no request-volume denominator
exists yet — documented as a candidate for a future build, not invented
here). No automated/scheduled alerting (manually-invoked, live-verified,
mirroring BUILD-22/24's drill treatment). No later-build functionality
(BUILD-26 security/privacy, BUILD-27 performance, etc.) begun.

KNOWN LIMITATIONS

See known-limitations-build25.md: no real APM/tracing backend; no
dashboard UI; no true SLO percentage (missing request-volume
denominator); no automated/scheduled alerting; GET /v1/metrics's
error/outbox figures are RLS-scoped under the application's own role,
not a true cross-tenant aggregate (documented CLI path with
ADMIN_DATABASE_URL for that); error_events deliberately does not store
stack traces or full request payloads (kept lean, full detail stays in
correlationId-linked logs only).

QUEUE TRANSITION

BUILD-25: ready -> in_progress -> completed.
Per the user's explicit "continue to full completion of all the builds
(30)" instruction, BUILD-26 is being readied and started immediately
following this report.

Commit: (this commit)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10
Next build: BUILD-26 (SEC-PRIV — Security and privacy)
