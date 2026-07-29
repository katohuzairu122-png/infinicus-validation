# BUILD-19 — Tenant Onboarding: Security Controls

## Tenant isolation (RLS)

`onboarding.tenant_onboarding` is `ENABLE ROW LEVEL SECURITY` +
`FORCE ROW LEVEL SECURITY` (migration `0140`), matching every prior
build's convention. Its predicate is deliberately broader than the usual
single `tenant_id = current_setting('app.tenant_id')` check:

```sql
CREATE POLICY tenant_onboarding_isolation ON onboarding.tenant_onboarding
  USING (
    tenant_id    = current_setting('app.tenant_id', true)::uuid
    OR initiated_by = current_setting('app.user_id', true)::uuid
  );
```

This is required because `resumeOnboarding()` must let a user find their
own in-progress attempt **before** full tenant context can be
established client-side (the whole point of the resume flow). This exact
OR-predicate shape is not new to this build — it mirrors
`tenancy.roles_isolation` (admits `tenant_id IS NULL` system roles) and
`audit.access_events_isolation` (admits `tenant_id IS NULL` tenant-less
events), both already present in the frozen schema since migration
`0011`.

## A genuine correctness bug found and fixed during this build's testing

While writing `OnboardingProgressRepository.getActiveForUser()` (the
resume lookup, which intentionally does not set `app.tenant_id` since the
caller doesn't know it yet), live testing surfaced
`invalid input syntax for type uuid: ""` — but only when this test ran
**after** other tests in the same suite, never in isolation. Root-caused
via direct `psql` reproduction:

```sql
BEGIN;
SELECT set_config('app.tenant_id', '<a real uuid>', true);  -- SET LOCAL semantics
COMMIT;
BEGIN;
SELECT current_setting('app.tenant_id', true);  -- returns '' , NOT NULL
```

Postgres custom/placeholder GUCs (the `class.name` convention used for
`app.tenant_id`, `app.workspace_id`, `app.user_id` throughout this
codebase) behave differently from the "never set" case once they have
been set **at least once** on a given backend connection: `SET LOCAL`
(or `set_config(..., true)`) reverts them to an **empty string**, not
true `NULL`, for the remainder of that session — even across separate
transactions, even after an explicit `RESET`. On a **pooled** connection
(this codebase's `Pool` has `min: 2, max: 10`), any connection that has
ever participated in one tenant-scoped transaction will exhibit this for
the rest of its lifetime. `current_setting('app.tenant_id', true)::uuid`
then throws instead of evaluating to `NULL`, because `''` is not valid
UUID syntax.

This is a **latent property of every RLS policy in this codebase** that
casts `current_setting(...)::uuid` directly — not something introduced by
this build. It was not previously observed because:
- Every prior tenant-scoped repository always calls `withTenantTransaction`,
  which unconditionally sets `app.tenant_id` to a real value before any
  query — the cast is never reached against a stale/empty session value.
- The one prior table with a `tenant_id IS NULL OR …` fallback policy
  (`audit.access_events`, BUILD-18) is safe for a different reason: when
  the row's own `tenant_id` is a literal `NULL`, Postgres's boolean `OR`
  evaluator short-circuits and never evaluates the second operand's cast
  — verified directly via `psql` as part of this investigation.
  `onboarding.tenant_onboarding.tenant_id` is `NOT NULL`, so its
  `tenant_id = current_setting(...)::uuid` operand is *never* a
  short-circuitable literal — it always evaluates, and always needs a
  valid cast.

**Fix**: `getActiveForUser()` now explicitly sets `app.tenant_id` to a
nil-UUID sentinel (`00000000-0000-0000-0000-000000000000`) before
querying, rather than leaving it unset. This keeps the cast always valid
(a syntactically correct UUID) while guaranteeing it can never equal a
real tenant id, so the policy's `initiated_by` fallback is the only path
that can ever admit a row here — exactly the intended access pattern.
The fix, its rationale, and this exact failure mode are documented as a
code comment directly on `getActiveForUser()`.

No other method in this build was affected (all others either always set
a real, known `app.tenant_id`/`app.workspace_id` via `withTenantTransaction`,
or query tables without RLS). BUILD-18's `AccessEventRepository` was
re-verified safe for the reason above and was not modified.

## Slug/code uniqueness without a pre-check read

`tenancy.tenants.slug` is globally unique, but `tenants_isolation`'s RLS
makes it impossible to `SELECT` for a slug's existence before the caller
already owns that exact tenant (fail-closed by design — you cannot probe
whether another tenant's slug is taken). `TenantRepository.create()` and
`WorkspaceRepository.create()` therefore do not attempt a check-then-act
pre-validation (which would also be racy); they attempt the `INSERT`
directly and translate the database's own unique-constraint violation
(Postgres error code `23505`, constraint name matched exactly) into
`TenantSlugConflictError`/`WorkspaceSlugConflictError`/
`BusinessCodeConflictError`. This is both simpler and race-free compared
to a separate availability check.

## Least privilege

- `TenantRepository`, `WorkspaceRepository`, `SettingsRepository` use the
  same least-privilege `app_test_user`-equivalent role as every other
  repository in this codebase — no elevated/`BYPASSRLS` connection is
  used at runtime.
- `OnboardingService` never bypasses RLS to compose its steps; each
  repository call it makes is subject to the same tenant-isolation
  policies as if called directly.

## Fail-closed step ordering

`OnboardingProgressRepository` enforces strict forward-only step
transitions (`OnboardingStepOrderError` on an out-of-order call) and
rejects any further mutation once an attempt is `completed` or
`abandoned` (`OnboardingAlreadyTerminalError`) — a caller cannot skip
owner assignment, silently re-open a finished onboarding, or resurrect an
abandoned one by calling steps directly.

## No secrets in progress state

`onboarding.tenant_onboarding` stores only entity ids, step names, and
timestamps — no password, token, or invitation secret is ever written to
this table. Invitation tokens are generated, hashed, and handled entirely
by the existing BUILD-18 `AuthorizationService`/`InvitationRepository`
machinery, unchanged by this build.
