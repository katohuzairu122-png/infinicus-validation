BUILD-18 COMPLETION REPORT — AUTHENTICATION AND AUTHORIZATION

Build ID: BUILD-18
Layer: AUTH
Date: 2026-07-22
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-18-AUTH-SPECIFICATION.md
Specification SHA-256: 330ff715175b9e16e8473672c0e31ff09351f2b33c347795ebdf28a0031ccd54
Status: COMPLETE

WHAT WAS BUILT

Server-side authentication and authorization built entirely on top of the
pre-existing Stage 1 foundation schema (`tenancy`/`identity`/`audit`,
migrations 0003/0004/0006/0007/0011) — no new schema design was required.
A preflight research pass confirmed this schema already existed and was
already structurally tested (`migration-stage2a.test.ts`, 55 tests) before
this build began. This build added: one idempotent seed migration (0137)
populating a 29-permission catalog and 4 system roles
(owner/admin/member/viewer); 9 repositories in
`packages/database/src/repositories/auth/`; a full `@infinicus/authentication`
package (password hashing, session/API-key tokens, `AuthenticationService`);
a full `@infinicus/authorization` package (RBAC checks, invitation
lifecycle, `AuthorizationService`, framework-agnostic HTTP guards); and 6
new test files (34 unit tests, 101 live-PostgreSQL integration tests).

FILES CREATED

infinicus-platform/infrastructure/database/migrations/0137_seed_auth_roles_permissions.sql
infinicus-platform/packages/database/src/repositories/auth/errors.ts
infinicus-platform/packages/database/src/repositories/auth/UserRepository.ts
infinicus-platform/packages/database/src/repositories/auth/SessionRepository.ts
infinicus-platform/packages/database/src/repositories/auth/ServiceAccountRepository.ts
infinicus-platform/packages/database/src/repositories/auth/ApiKeyRepository.ts
infinicus-platform/packages/database/src/repositories/auth/RoleRepository.ts
infinicus-platform/packages/database/src/repositories/auth/PermissionRepository.ts
infinicus-platform/packages/database/src/repositories/auth/MembershipRepository.ts
infinicus-platform/packages/database/src/repositories/auth/InvitationRepository.ts
infinicus-platform/packages/database/src/repositories/auth/AccessEventRepository.ts
infinicus-platform/packages/database/src/repositories/auth/index.ts
infinicus-platform/packages/database/tests/auth-repositories.integration.test.ts
infinicus-platform/packages/authentication/src/errors.ts
infinicus-platform/packages/authentication/src/password.ts
infinicus-platform/packages/authentication/src/tokens.ts
infinicus-platform/packages/authentication/src/AuthenticationService.ts
infinicus-platform/packages/authentication/tests/password.test.ts
infinicus-platform/packages/authentication/tests/tokens.test.ts
infinicus-platform/packages/authentication/tests/AuthenticationService.integration.test.ts
infinicus-platform/packages/authorization/src/errors.ts
infinicus-platform/packages/authorization/src/invitationTokens.ts
infinicus-platform/packages/authorization/src/AuthorizationService.ts
infinicus-platform/packages/authorization/src/guards.ts
infinicus-platform/packages/authorization/tests/invitationTokens.test.ts
infinicus-platform/packages/authorization/tests/AuthorizationService.integration.test.ts
infinicus-platform/docs/production-readiness/architecture-and-scope.md
infinicus-platform/docs/production-readiness/configuration.md
infinicus-platform/docs/production-readiness/operating-procedure.md
infinicus-platform/docs/production-readiness/security-controls.md
infinicus-platform/docs/production-readiness/test-evidence.md
infinicus-platform/docs/production-readiness/rollback-procedure.md
infinicus-platform/docs/production-readiness/known-limitations.md

FILES MODIFIED

infinicus-platform/packages/database/src/index.ts (export new auth repositories/errors)
infinicus-platform/packages/database/package.json (add "require" export condition)
infinicus-platform/packages/authentication/package.json (dependencies, typecheck script, "require" export condition)
infinicus-platform/packages/authentication/src/index.ts (full barrel, replacing placeholder)
infinicus-platform/packages/authorization/package.json (dependencies, typecheck script, "require" export condition)
infinicus-platform/packages/authorization/src/index.ts (full barrel, replacing placeholder)
infinicus-platform/pnpm-lock.yaml (dependency resolution)

ARCHITECTURE

Nine-layer authority model preserved — this build adds a cross-cutting
capability, not a tenth layer, and does not alter any layer's schema or
handoff contracts. Reuses the frozen `tenancy`/`identity`/`audit` schema
rather than duplicating infrastructure. `AuthenticationService` and
`AuthorizationService` are the sole server-side decision points; no
client-side authorization logic exists. `guards.ts` is deliberately
framework-agnostic since no HTTP framework is chosen yet for `apps/api`
(root CLAUDE.md §4) — see docs/production-readiness/architecture-and-scope.md
for full detail.

SECURITY

bcrypt (cost factor 12) for passwords with strength validation
(>=12 chars, >=3 character classes) enforced before hashing; SHA-256 for
high-entropy session/API-key tokens (documented rationale in
tokens.ts); fail-closed `validateSession`/`authorize` (throw typed
errors, never return null/false); no secrets in logs, events, or error
messages; raw tokens/keys returned to the caller exactly once and never
persisted. Full detail: docs/production-readiness/security-controls.md.

TENANCY AND AUTHORIZATION

RLS-enforced tenant isolation reused unchanged from migrations
0004/0011 (this build created no new RLS policy). Cross-tenant isolation
live-tested across 5 dedicated tests (service account, membership,
invitation, API key, access events). Two genuine schema-driven
chicken-and-egg constraints identified and resolved: API-key
verification requires tenant context resolved upstream (documented as
out-of-scope pending a future HTTP-layer build); invitation tokens
self-encode `tenantId:workspaceId:secret` so acceptance can resolve
tenant context without a blind RLS-scoped lookup.

DATABASE CHANGES

One migration: 0137_seed_auth_roles_permissions.sql. Pure
`INSERT ... ON CONFLICT DO NOTHING` seed data — zero `CREATE TABLE`
statements. Seeds 29 permissions (9 business layers x
read/write/admin, plus platform:member_manage and platform:admin) and 4
system roles (owner=29 perms, admin=28, member=18, viewer=9) with their
role_permissions grants. Migrations 0001-0136 verified byte-identical
via `git diff --exit-code` (untouched).

API CHANGES

None. No HTTP framework is chosen yet for apps/api (deferred per root
CLAUDE.md §4); `guards.ts` provides framework-agnostic
`createAuthGuard`/`createPermissionGuard` functions ready for a future
adapter, but no actual HTTP route was created in this build.

UI CHANGES

None. No login, registration, invitation-acceptance, or role-management
UI was built — out of scope for this build (service/repository layer
only).

CONFIGURATION

No new environment variables. Reuses existing `DATABASE_URL`/
`ADMIN_DATABASE_URL`. Package `exports` maps for `@infinicus/database`,
`@infinicus/authentication`, and `@infinicus/authorization` gained a
"require" condition (alongside the existing "import" condition, both
pointing at the same CommonJS dist/index.js) to fix a genuine
ERR_PACKAGE_PATH_NOT_EXPORTED failure surfaced by this build's
cross-package dependency chain. Full detail:
docs/production-readiness/configuration.md.

OBSERVABILITY

Every authentication/authorization decision of security interest is
recorded via `AccessEventRepository` into `audit.access_events`: login,
logout, failed_auth (with a `reason` in metadata: unknown_email,
bad_password, or account_not_active), permission_denied (with
permissionCode in metadata), and session_revocation. No new metrics or
tracing were added (out of scope; the platform has no observability
package wiring yet).

TESTS

6 new test files: 34 unit tests (password.test.ts, tokens.test.ts,
invitationTokens.test.ts) + 101 live-PostgreSQL integration tests
(65 in auth-repositories.integration.test.ts, 22 in
AuthenticationService.integration.test.ts, 14 in
AuthorizationService.integration.test.ts). All passing. Full detail and
breakdown by spec §6 requirement: docs/production-readiness/test-evidence.md.

VALIDATION

pnpm typecheck: 3/3 packages with a typecheck script pass (database,
authentication, authorization).
pnpm lint: 21/21 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database).
pnpm build: 21/21 packages build successfully.
Frozen-migration byte-identity: `git diff --exit-code` on migrations
0001-0136 (excluding new 0137) — clean.
Empty-database install: migrations 0001-0137 applied to a fresh
database in one pass, 0 errors; seed data verified
(29/28/18/9 role-permission counts).
Migration idempotency: re-run against the already-migrated database —
0 applies, 137 skips.

ROLLBACK

Migration 0137 is pure seed data (INSERT ... ON CONFLICT DO NOTHING,
no CREATE TABLE) — reversible via a documented DELETE sequence with a
fail-closed FK guard against any already-assigned system role. No
schema changes beyond seed data means application-code rollback is a
plain commit revert with no data migration or backfill required. Full
procedure: docs/production-readiness/rollback-procedure.md.

REGRESSION RESULTS

packages/database: 22 test files, 2685 passed | 8 skipped (2693 total)
— every prior domain (da, bo, bi, dt, simulation, adi, aba, om, cl, plus
all migration-stage2* structural suites) passed unchanged.
packages/authentication: 3 test files, 45 passed | 1 skipped (46 total).
packages/authorization: 2 test files, 25 passed | 1 skipped (26 total).

OUT-OF-SCOPE CONFIRMATION

No HTTP framework was chosen or added to apps/api (root CLAUDE.md §4).
No external identity provider (OAuth/OIDC/SAML) was added — first-party
email/password + service-account API keys only, matching the frozen
schema's actual columns. No multi-factor authentication (no schema
support exists). No password-reset flow (no email-delivery integration
exists). No UI. No later-build functionality (onboarding, workflow
engine, billing, etc.) was implemented. No frozen migration (0001-0136)
or existing repository/table from any prior build was modified.

KNOWN LIMITATIONS

Full detail in docs/production-readiness/known-limitations.md. Summary:
no HTTP layer yet (guards are framework-agnostic pending a future
build); API-key tenant resolution requires upstream context resolution
(structural constraint of the frozen RLS schema, not a defect); no MFA;
no account lockout/rate limiting (access-event data exists for a future
policy to consume); no password-reset flow;
AuthorizationService.acceptInvitation currently surfaces
InvitationStateConflictError rather than the unused
InvitationExpiredError for expired invitations (behavior is correct and
fully tested, just not using the most specific available error class);
SHA-256 (not a memory-hard KDF) is an intentional choice for
high-entropy session/API-key tokens, documented to preempt reviewer
confusion with password-hashing practice.

QUEUE TRANSITION

BUILD-18: pending -> ready -> in_progress -> completed. currentReadyBuild
remains null — BUILD-19 was not readied or started, per explicit
instruction (spec §8, §10).

Commit: (see next commit in this branch)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10 (tracking PR for this branch) — to be updated with this build's summary.
Next build: BUILD-19 (ONBOARDING). Not readied. Per BUILD-18
specification §8/§10, a future session must explicitly re-verify
BUILD-19's preconditions against
docs/implementation-queue/BUILD-19-ONBOARDING-SPECIFICATION.md and the
current repository state before marking it ready.
