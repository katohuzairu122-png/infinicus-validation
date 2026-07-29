# BUILD-19 — Tenant Onboarding: Test Evidence

All tests below were executed against a live local disposable PostgreSQL
16 instance (migrations `0001`–`0141` applied). Every number below is
from an actual `vitest run` execution, not asserted from code review.

## New test files (this build)

| File | Package | Kind | Result |
|---|---|---|---|
| `tests/onboarding-repositories.integration.test.ts` | `@infinicus/database` | Live integration | 34 passed, 1 skipped (guard) |
| `tests/OnboardingService.integration.test.ts` | `@infinicus/onboarding` | Live integration | 12 passed, 1 skipped (guard) |

**Totals:** 46 live-database integration tests, 0 failures.

## Coverage by requirement (spec §6)

- **Integration tests**: all 5 onboarding repositories (Tenant, Workspace,
  Business, Settings, OnboardingProgress) against the live schema; the
  full `OnboardingService` wizard flow end-to-end.
- **Authorization and tenant-isolation tests**: dedicated "cross-tenant
  isolation (live RLS)" block (3 tests) in the repository suite — a
  different user cannot resolve another user's onboarding via
  `getActiveForUser`; tenant B cannot read tenant A's onboarding row by
  id even with the correct row id; a business created under tenant A is
  invisible under tenant B's context. The full-flow test also verifies
  the assigned owner actually has `platform:admin` permission afterward
  (`AuthorizationService.hasPermission`), proving the role assignment
  step has real effect, not just a database row.
- **Failure-path tests**: unknown tenant/workspace/business/onboarding
  lookups (`*NotFoundError` for each); duplicate tenant slug, duplicate
  workspace slug within a tenant, duplicate business code within a
  tenant (`*ConflictError` for each); step called out of order
  (`OnboardingStepOrderError`, both at the repository level and surfaced
  through `OnboardingService`); further mutation attempted on an
  abandoned onboarding (`OnboardingAlreadyTerminalError`); `completeOnboarding`
  before `invitations_sent` has been reached.
- **Idempotency tests**: re-recording an already-completed step is a
  no-op (verified by comparing `updatedAt` timestamps are unchanged);
  `markCompleted` called twice returns the same `completedAt`;
  `OnboardingService.setBusiness`/`assignOwner` called twice each return
  the same underlying row rather than creating a second one;
  `inviteTeamMembers` does not re-invite an email that already has a
  pending invitation.
- **Migration tests**: fresh-database install and re-run idempotency
  (below).
- **Security tests**: the RLS/cross-tenant tests above, plus the
  `getActiveForUser` empty-string-cast defect discovery and fix (see
  `security-controls-build19.md`) — re-verified fixed via the full suite
  passing after the change.
- **Regression tests**: full existing `@infinicus/database` suite
  re-run unchanged (below).

## Full regression (this build's changes against every prior build)

```
packages/database: 23 test files, 2719 passed | 9 skipped (2728 total)
```

Every prior domain's suite (`da`, `bo`, `bi`, `dt`, `simulation`, `adi`,
`aba`, `om`, `cl`, `auth`, plus all `migration-stage2*` structural suites)
passed unchanged — the new `onboarding` domain did not alter any existing
table, RLS policy, or repository.

## Static checks

```
pnpm typecheck   → 4/4 packages with a typecheck script pass (database, authentication, authorization, onboarding)
pnpm lint        → 22/22 packages pass (0 errors; 5 pre-existing console-statement
                    warnings in packages/database/src/client.ts and migrate.ts,
                    unrelated to this build)
pnpm build       → 22/22 packages build successfully
```

## Frozen-migration byte-identity

```
git diff --exit-code -- infinicus-platform/infrastructure/database/migrations/ \
  ':!.../0138_create_onboarding_schema.sql' ':!.../0139_create_onboarding_indexes.sql' \
  ':!.../0140_create_onboarding_rls_policies.sql' ':!.../0141_create_onboarding_triggers_events.sql'
→ exit 0 (clean — migrations 0001-0137 untouched)
```

## Empty-database install test

Migrations `0001`–`0141` applied in one pass to a freshly created,
completely empty database (`infinicus_test_fresh`):

```
141 files: 141 "apply … done" lines, 0 errors
```

Post-install verification: `onboarding.tenant_onboarding` table present
with all expected columns, constraints, and the `tenant_onboarding_isolation`
policy (confirmed via `\d onboarding.tenant_onboarding` against the fresh
database).

## Migration idempotency test

Re-running the migration runner against the already-migrated fresh
database:

```
0 "apply" lines, 141 "skip" lines
```

## Defect found and fixed during live testing (before this document was written)

One genuine correctness bug — the empty-string-vs-NULL `current_setting`
cast failure in `OnboardingProgressRepository.getActiveForUser()` on a
previously-tenant-scoped pooled connection — was found by running the
live integration tests (not by code review) and fixed before this build
was considered complete. Full root-cause analysis and the fix are
documented in `security-controls-build19.md`. A second, unrelated
test-authoring bug (two tests used a business's or tenant's id as a
placeholder `membership_id`, tripping the real foreign-key constraint
added by this build) was also caught and fixed by creating genuine
membership rows in those tests. Both fixes were verified by re-running
the full live-integration suite to green before proceeding.
