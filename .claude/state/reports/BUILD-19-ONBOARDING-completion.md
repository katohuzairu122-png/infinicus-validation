BUILD-19 COMPLETION REPORT — TENANT ONBOARDING

Build ID: BUILD-19
Layer: ONBOARDING
Date: 2026-07-22
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-19-ONBOARDING-SPECIFICATION.md
Specification SHA-256: 9c154c27decb80109987ac998bc54b8da7b0542ec9da5d538e193124a830f0bf
Status: COMPLETE

WHAT WAS BUILT

A resumable, multi-step tenant onboarding wizard built on top of the
frozen tenancy/platform/identity schema (migrations 0003/0004/0005) and
the BUILD-18 authentication/authorization capability. Added one new
schema (onboarding) with a single progress-tracking table
(onboarding.tenant_onboarding, migrations 0138-0141); five repositories
in packages/database (Tenant, Workspace, Business, Settings,
OnboardingProgress); and a new packages/onboarding package containing
OnboardingService, which orchestrates begin -> business -> owner ->
settings -> invitations -> complete as a sequence of independently
atomic, idempotent, resumable steps. 46 live PostgreSQL integration
tests were added, all passing, alongside the full existing regression
suite (2719 tests) unchanged.

FILES CREATED

infinicus-platform/infrastructure/database/migrations/0138_create_onboarding_schema.sql
infinicus-platform/infrastructure/database/migrations/0139_create_onboarding_indexes.sql
infinicus-platform/infrastructure/database/migrations/0140_create_onboarding_rls_policies.sql
infinicus-platform/infrastructure/database/migrations/0141_create_onboarding_triggers_events.sql
infinicus-platform/packages/database/src/repositories/onboarding/errors.ts
infinicus-platform/packages/database/src/repositories/onboarding/TenantRepository.ts
infinicus-platform/packages/database/src/repositories/onboarding/WorkspaceRepository.ts
infinicus-platform/packages/database/src/repositories/onboarding/BusinessRepository.ts
infinicus-platform/packages/database/src/repositories/onboarding/SettingsRepository.ts
infinicus-platform/packages/database/src/repositories/onboarding/OnboardingProgressRepository.ts
infinicus-platform/packages/database/src/repositories/onboarding/index.ts
infinicus-platform/packages/database/tests/onboarding-repositories.integration.test.ts
infinicus-platform/packages/onboarding/package.json
infinicus-platform/packages/onboarding/tsconfig.json
infinicus-platform/packages/onboarding/src/errors.ts
infinicus-platform/packages/onboarding/src/OnboardingService.ts
infinicus-platform/packages/onboarding/src/index.ts
infinicus-platform/packages/onboarding/tests/OnboardingService.integration.test.ts
infinicus-platform/docs/production-readiness/architecture-and-scope-build19.md
infinicus-platform/docs/production-readiness/configuration-build19.md
infinicus-platform/docs/production-readiness/operating-procedure-build19.md
infinicus-platform/docs/production-readiness/security-controls-build19.md
infinicus-platform/docs/production-readiness/test-evidence-build19.md
infinicus-platform/docs/production-readiness/rollback-procedure-build19.md
infinicus-platform/docs/production-readiness/known-limitations-build19.md

FILES MODIFIED

infinicus-platform/packages/database/src/index.ts (export new onboarding repositories/errors)
infinicus-platform/pnpm-lock.yaml (dependency resolution)

ARCHITECTURE

Nine-layer authority model preserved — this build adds a cross-cutting
orchestration capability, not a tenth layer. Reuses the frozen
tenancy/platform/identity schema and the BUILD-18 role/membership/
invitation machinery verbatim; the only new schema object is the
progress-tracking table. Each onboarding step is its own atomic
transaction, composed sequentially by OnboardingService (never nested),
so a mid-flow failure leaves durable, resumable state rather than
rolling back already-succeeded work — this is what makes "resume/retry
behavior" (an explicit required scope item) meaningful. Full detail:
docs/production-readiness/architecture-and-scope-build19.md.

SECURITY

Fail-closed step ordering (OnboardingStepOrderError on out-of-order
calls, OnboardingAlreadyTerminalError once completed/abandoned);
idempotent step re-recording (no duplicate side effects on retry);
uniqueness enforced via database constraint violation translation rather
than racy pre-checks; no secrets stored in onboarding progress state. A
genuine Postgres correctness bug (custom GUCs reverting to '' rather than
NULL after SET LOCAL on a pooled connection, causing an invalid-uuid-cast
error) was discovered and fixed during live testing — full root-cause
analysis in docs/production-readiness/security-controls-build19.md.

TENANCY AND AUTHORIZATION

onboarding.tenant_onboarding uses RLS with an OR-predicate (tenant match
OR initiating-user match) mirroring the existing pattern already used by
tenancy.roles_isolation and audit.access_events_isolation since migration
0011 — required so a user can resume before full tenant context is
known. Cross-tenant isolation live-tested across 3 dedicated tests
(resume lookup, onboarding-row read, business read). Owner role
assignment reuses BUILD-18's AuthorizationService.assignRole verbatim
(no new role or permission was seeded).

DATABASE CHANGES

Four migrations: 0138 (schema + table), 0139 (indexes), 0140 (RLS),
0141 (updated_at trigger + onboarding.emit_outbox_event + 3 wrapper
functions for onboarding.step.completed / onboarding.completed /
onboarding.abandoned events). Zero changes to any pre-existing table,
column, or RLS policy. Migrations 0001-0137 verified byte-identical via
`git diff --exit-code` (untouched).

API CHANGES

None. No HTTP framework is chosen yet for apps/api (deferred per root
CLAUDE.md §4, same boundary as BUILD-18); OnboardingService is
framework-agnostic and callable directly, ready for a future HTTP
adapter.

UI CHANGES

None. No wizard frontend was built — service/repository layer only, out
of scope for this build.

CONFIGURATION

No new environment variables. New package @infinicus/onboarding added
(mirrors @infinicus/authentication/@infinicus/authorization's
package.json/tsconfig.json shape, including the "require" export
condition fix from BUILD-18). The new onboarding PostgreSQL schema
required a one-time local grant (documented, not committed as a
migration, matching this repository's standing convention that grants
are never part of migration files). Full detail:
docs/production-readiness/configuration-build19.md.

OBSERVABILITY

Every step completion, final completion, and abandonment emits an outbox
event into events.outbox_events via onboarding.emit_outbox_event(),
following the identical pattern used by every domain schema since
data_acquisition.emit_outbox_event (migration 0022). No new metrics or
tracing were added (out of scope, matching BUILD-18).

TESTS

2 new test files: 46 live-PostgreSQL integration tests (34 in
onboarding-repositories.integration.test.ts, 12 in
OnboardingService.integration.test.ts). All passing. Full detail and
breakdown by spec §6 requirement: docs/production-readiness/test-evidence-build19.md.

VALIDATION

pnpm typecheck: 4/4 packages with a typecheck script pass (database,
authentication, authorization, onboarding).
pnpm lint: 22/22 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database).
pnpm build: 22/22 packages build successfully.
Frozen-migration byte-identity: `git diff --exit-code` on migrations
0001-0137 (excluding new 0138-0141) — clean.
Empty-database install: migrations 0001-0141 applied to a fresh
database in one pass, 0 errors; onboarding.tenant_onboarding table and
its RLS policy verified present.
Migration idempotency: re-run against the already-migrated database —
0 applies, 141 skips.

ROLLBACK

Migrations 0138-0141 are additive only (one new schema, one new table,
no changes to any pre-existing object) — reversible via a documented
DROP sequence that explicitly does not delete any tenant/workspace/
business row created through onboarding (those are real tenant data,
not onboarding-specific state). Application-code rollback is a plain
commit revert with no data migration required. Full procedure:
docs/production-readiness/rollback-procedure-build19.md.

REGRESSION RESULTS

packages/database: 23 test files, 2719 passed | 9 skipped (2728 total)
— every prior domain (da, bo, bi, dt, simulation, adi, aba, om, cl,
auth, plus all migration-stage2* structural suites) passed unchanged.
packages/onboarding: 1 test file, 12 passed | 1 skipped (13 total).

OUT-OF-SCOPE CONFIRMATION

No UI/wizard frontend. No HTTP framework was chosen or added to apps/api
(root CLAUDE.md §4, same boundary as BUILD-18). No email delivery for
invitations. No multi-workspace onboarding. No tenant-deletion capability
for abandoned attempts. No industry taxonomy/enum (reuses the existing
free-text column). No later-build functionality (workflow engine,
billing, etc.) was implemented. No frozen migration (0001-0137) or
existing repository/table from any prior build was modified.

KNOWN LIMITATIONS

Full detail in docs/production-readiness/known-limitations-build19.md.
Summary: no UI, no HTTP layer, no email delivery for invitations,
onboarding creates exactly one workspace, abandoning does not delete
tenant data (a second attempt creates an independent tenant), default
settings are a fixed hardcoded set, industry is free text not a
controlled vocabulary, and the empty-string/NULL current_setting cast
behavior documented in security-controls-build19.md is a standing
footgun for any future repository with a similar "resume before full
tenant context is known" shape.

QUEUE TRANSITION

BUILD-19: pending -> ready -> in_progress -> completed. currentReadyBuild
remains null — BUILD-20 was not readied or started, per explicit
instruction (spec §8, §10).

Commit: (see next commit in this branch)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10 (tracking PR for this branch) — to be updated with this build's summary.
Next build: BUILD-20 (WORKFLOW). Not readied. Per BUILD-19
specification §8/§10, a future session must explicitly re-verify
BUILD-20's preconditions against
docs/implementation-queue/BUILD-20-WORKFLOW-SPECIFICATION.md and the
current repository state before marking it ready.
