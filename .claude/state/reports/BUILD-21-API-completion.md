BUILD-21 COMPLETION REPORT — GOVERNED APPLICATION API

Build ID: BUILD-21
Layer: API
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-21-API-SPECIFICATION.md
Specification SHA-256: a5eafc2b92ebc69ae3216f8fb7f88c71afc8bdba0c4ada108b8c298882ecdd66
Status: COMPLETE

WHAT WAS BUILT

A real, versioned, governed HTTP surface (Fastify 5) in `apps/api`
exposing the already-built `AuthenticationService`, `AuthorizationService`
(BUILD-18), `OnboardingService` (BUILD-19), and `DecisionWorkflowService`
(BUILD-20) — the first build in this sequence to give any of those
service layers a real network-reachable interface. Delivers every
required capability from spec §2: versioned routes (`/v1/...`),
Zod-schema request/response validation, Bearer-token authentication,
real membership-verified tenant-context authorization plus
permission-gated writes, tenant+route-scoped HTTP idempotency (backed by
a new `api.idempotency_keys` table), response-layer pagination,
correlation IDs, a single controlled/redacted error envelope, global
rate limiting, per-request audit logging, OpenAPI documentation
(Swagger UI + generated JSON), and a 26-test live-PostgreSQL integration
suite. The Fastify framework choice (gated behind "only after the base
architecture is approved" in root CLAUDE.md §4) was confirmed directly
with the user before any server code was written. `packages/configuration`
and `packages/observability`, previously an unimplemented stub and an
empty placeholder respectively, were rewritten as real, tested packages
in service of this build's configuration and audit-logging requirements.

FILES CREATED

infinicus-platform/infrastructure/database/migrations/0142_create_api_schema.sql
infinicus-platform/infrastructure/database/migrations/0143_create_api_indexes.sql
infinicus-platform/infrastructure/database/migrations/0144_create_api_rls_policies.sql
infinicus-platform/infrastructure/database/migrations/0145_create_api_triggers.sql
infinicus-platform/packages/database/src/repositories/api/errors.ts
infinicus-platform/packages/database/src/repositories/api/IdempotencyKeyRepository.ts
infinicus-platform/packages/database/src/repositories/api/index.ts
infinicus-platform/packages/database/tests/api-idempotency.integration.test.ts
infinicus-platform/packages/configuration/tests/loadConfig.test.ts
infinicus-platform/packages/observability/tests/logger.test.ts
infinicus-platform/apps/api/src/types.ts
infinicus-platform/apps/api/src/errors.ts
infinicus-platform/apps/api/src/app.ts
infinicus-platform/apps/api/src/server.ts
infinicus-platform/apps/api/src/plugins/correlationId.ts
infinicus-platform/apps/api/src/plugins/errorHandler.ts
infinicus-platform/apps/api/src/plugins/auth.ts
infinicus-platform/apps/api/src/plugins/tenantContext.ts
infinicus-platform/apps/api/src/plugins/permission.ts
infinicus-platform/apps/api/src/plugins/idempotency.ts
infinicus-platform/apps/api/src/schemas/common.ts
infinicus-platform/apps/api/src/schemas/auth.ts
infinicus-platform/apps/api/src/schemas/onboarding.ts
infinicus-platform/apps/api/src/schemas/businesses.ts
infinicus-platform/apps/api/src/routes/auth.ts
infinicus-platform/apps/api/src/routes/onboarding.ts
infinicus-platform/apps/api/src/routes/businesses.ts
infinicus-platform/apps/api/tests/api.integration.test.ts
infinicus-platform/docs/production-readiness/architecture-and-scope-build21.md
infinicus-platform/docs/production-readiness/configuration-build21.md
infinicus-platform/docs/production-readiness/operating-procedure-build21.md
infinicus-platform/docs/production-readiness/security-controls-build21.md
infinicus-platform/docs/production-readiness/test-evidence-build21.md
infinicus-platform/docs/production-readiness/rollback-procedure-build21.md
infinicus-platform/docs/production-readiness/known-limitations-build21.md

FILES MODIFIED

infinicus-platform/packages/database/src/index.ts (BUILD-21 barrel exports: IdempotencyConflictError, IdempotencyKeyRepository, IdempotencyRecord, IdempotencyBeginResult)
infinicus-platform/packages/configuration/src/index.ts (rewritten: real fail-closed loadConfig(), replacing the "not yet implemented" stub)
infinicus-platform/packages/configuration/package.json (added @types/node devDependency, "require" export condition, typecheck script, vitest devDependency)
infinicus-platform/packages/observability/src/index.ts (rewritten: pino-based createLogger/withCorrelationId/logAuditEntry, replacing the empty export {} placeholder)
infinicus-platform/packages/observability/package.json (added "require" export condition, typecheck script, vitest and pino dependencies)
infinicus-platform/apps/api/package.json (rewritten: Fastify application dependencies, scripts, and workspace dependencies)
infinicus-platform/apps/api/src/index.ts (rewritten: exports buildApp, replacing the placeholder export {})
infinicus-platform/pnpm-lock.yaml (updated for all new/changed dependencies above)

ARCHITECTURE

Nine-layer authority model preserved — this build adds a governed HTTP
gateway, not a tenth layer. Every route handler is a thin, schema-
validated wrapper delegating to an already-built, already-tested service
(AuthenticationService, AuthorizationService, OnboardingService,
DecisionWorkflowService); no business logic was reimplemented at the
HTTP layer. The only genuinely new persistence is the HTTP-layer
idempotency table, since no existing repository's idempotency mechanism
generalizes across arbitrary routes. Full detail:
docs/production-readiness/architecture-and-scope-build21.md.

SECURITY

Fail-closed Bearer-token authentication on every protected route. Real
membership-verified tenant-context resolution (X-Tenant-Id/
X-Workspace-Id headers cross-checked against an ACTIVE
tenancy.memberships row) — genuine authorization enforcement, going
further than apps/web's BUILD-20 query-parameter placeholder since
Bearer-token auth actually proves caller identity here. Permission-gated
writes reuse AuthorizationService.authorize() with zero new logic.
Controlled, redacted error envelope for every response; a genuine bug
was found and fixed during this build's own testing where the error
name-to-status lookup table initially keyed off dead (never-fired)
specific error-subclass names instead of the generic base names
packages/database's error hierarchy actually produces at runtime — full
detail in docs/production-readiness/security-controls-build21.md.

TENANCY AND AUTHORIZATION

New RLS-protected table (api.idempotency_keys,
tenant_id = current_setting('app.tenant_id', true)::uuid), live-tested
for cross-tenant independence. Every other read/write reuses existing
RLS policies unchanged, reached through the same withTenantTransaction
pattern every prior build relies on. Cross-tenant and no-membership
denial live-tested via HTTP: a user with zero memberships receives 404
against a real tenant/workspace pair; a viewer-role user receives 403
attempting an aba:write operation.

DATABASE CHANGES

Four new migrations (0142-0145): one new schema (api), one new table
(api.idempotency_keys) with a UNIQUE (tenant_id, idempotency_key,
route) constraint, its index, its RLS policy, and its updated_at
trigger. No existing table, column, or RLS policy from any prior
migration was altered. Migrations 0001-0141 verified byte-identical
(git status --porcelain shows only 0142-0145 as new).

API CHANGES

New: apps/api's entire HTTP surface. POST/GET /v1/auth/{register,login,
logout,session}; POST/GET /v1/onboarding{,/active}; GET /v1/businesses;
GET /v1/businesses/:businessId/workflow; POST
/v1/businesses/:businessId/decisions (aba:write, idempotent); POST
/v1/businesses/:businessId/outcomes (om:write, idempotent); GET
/v1/health; GET /documentation and /documentation/json (OpenAPI). Full
route-to-capability mapping in
docs/production-readiness/architecture-and-scope-build21.md.

UI CHANGES

None. This build is a backend HTTP API, not a browser UI — apps/web
(BUILD-20) is unmodified.

CONFIGURATION

Six environment variables: DATABASE_URL (required), PORT, LOG_LEVEL,
RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS (all optional with defaults), and
NODE_ENV. packages/configuration's loadConfig() rewritten from an
unconditional-throw stub into a real, fail-closed loader; the stale
Supabase-era fields it previously declared (supabaseUrl, supabaseKey,
sentryDsn) were deleted as unused artifacts from an earlier
architectural phase. Full detail:
docs/production-readiness/configuration-build21.md.

OBSERVABILITY

packages/observability rewritten from an empty placeholder into a
pino-based logger (createLogger, withCorrelationId, logAuditEntry). One
new structured audit-log line per request (correlationId, tenantId,
userId, method, route, statusCode, durationMs) via an onResponse hook —
a lighter-weight, always-on complement to BUILD-18's audit.access_events
table. No new outbox events; every state-changing write this API
exposes goes through the domain repository that already owns event
emission for that stage.

TESTS

4 new test files: 14 unit tests (loadConfig.test.ts, logger.test.ts) +
33 live-PostgreSQL integration tests (api-idempotency.integration.test.ts:
7 passed + 1 skip-guard; api.integration.test.ts: 26 passed + 1
skip-guard), 47 total executed assertions. All passing, all against a
real live database via Fastify's app.inject().

VALIDATION

pnpm typecheck: 8/8 packages with a typecheck script pass (configuration,
database, observability, workflow, authentication, authorization,
onboarding, api).
pnpm lint: 23/23 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database).
pnpm build: 23/23 packages build successfully, including next build for
@infinicus/web and tsc for @infinicus/api.
Frozen-migration byte-identity: git status --porcelain on
infrastructure/database/migrations/ — only 0142-0145 new, 0001-0141
untouched.
Empty-database install test: migrations 0001-0145 applied cleanly to a
fresh database in one pass, zero errors; api.idempotency_keys table,
RLS policy, and trigger all verified present; scratch database dropped
after verification.
Migration idempotency test: re-ran runMigrations() against the
already-migrated database — all 145 migrations (including 0142-0145)
reported skip.

ROLLBACK

Four migrations to roll back via a documented DROP SCHEMA/DELETE FROM
_migrations transaction (api.idempotency_keys holds no business data,
so rollback cannot lose or orphan any tenant/domain record).
Application-code rollback is a plain commit revert — apps/api, the new
packages/database/src/repositories/api/ directory, and the
packages/configuration/packages/observability rewrites are all this
build's own new code, touching no existing repository, service, or
exported function from any prior build. Full procedure:
docs/production-readiness/rollback-procedure-build21.md.

REGRESSION RESULTS

packages/database: 24 test files, 2726 passed | 10 skipped (2736 total)
— every prior domain (da, bo, bi, dt, simulation, adi, aba, om, cl,
auth, onboarding, plus all migration-stage2* structural suites, plus
the new api-idempotency suite) passed unchanged.
packages/configuration: 1 test file, 9 passed.
packages/observability: 1 test file, 5 passed.
packages/authentication: 3 test files, 45 passed | 1 skipped (46 total).
packages/authorization: 2 test files, 25 passed | 1 skipped (26 total).
packages/workflow: 1 test file, 12 passed | 1 skipped (13 total).
packages/onboarding: 1 test file, 12 passed | 1 skipped (13 total).
apps/web: 1 test file, 10 passed.
apps/api: 1 test file, 26 passed | 1 skipped (27 total).

OUT-OF-SCOPE CONFIRMATION

No later-build functionality was implemented. Pagination is applied at
the response layer over an already-fetched array, not pushed into SQL
LIMIT/OFFSET (documented simplification). No email-verification/
activation HTTP route was built (an early test-only backdoor route was
deliberately removed as a security anti-pattern; tests activate users
directly via the repository instead). POST /v1/onboarding deliberately
has no idempotency requirement (tenant-scoped mechanism, no tenant yet
exists at that point — mirrors BUILD-19's identical bootstrap
exception). The workflow-view HTTP response is a summarized aggregate,
not the full nested shape apps/web renders. No API-key/service-account
authentication path was wired up (Bearer session tokens only). No
frozen migration (0001-0141) or existing repository/table/service from
any prior build was modified.

KNOWN LIMITATIONS

Full detail in docs/production-readiness/known-limitations-build21.md.
Summary: pagination is in-memory over a full fetch rather than SQL-level;
no email-verification/activation flow; POST /v1/onboarding has no
idempotency requirement (deliberate bootstrap exception); the
workflow-view response is summarized, not the full nested shape; no
new session-lifecycle behavior beyond BUILD-18's; no API-key
authentication path; the rate limiter's actual 429 threshold is not
integration-tested (only header presence is).

QUEUE TRANSITION

BUILD-21: blocked -> ready -> in_progress -> completed. currentReadyBuild
remains null — BUILD-22 was not readied or started, per explicit
instruction (spec §8, §10).

Commit: (see next commit in this branch)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10 (tracking PR for this branch) — to be updated with this build's summary.
Next build: BUILD-22. Not readied. Per BUILD-21 specification §8/§10, a
future session must explicitly re-verify BUILD-22's preconditions
against the current repository state before marking it ready.
