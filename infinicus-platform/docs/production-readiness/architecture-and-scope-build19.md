# BUILD-19 — Tenant Onboarding: Architecture and Scope

**Build:** BUILD-19 (ONBOARDING) · **Depends on:** BUILD-18 (completed) · **Status:** Complete

## Purpose

Deliver a resumable, multi-step tenant onboarding wizard: tenant creation,
workspace creation, business creation with industry selection, owner
membership assignment, default settings, team invitations, and progress
tracking that survives a dropped connection or a new session — on top of
the frozen `tenancy`/`platform`/`identity` schema and the BUILD-18
authentication/authorization capability.

## What already existed (reused, not duplicated)

- `tenancy.tenants`, `tenancy.workspaces` (migration `0003`)
- `platform.businesses`, `platform.system_settings` (migration `0005`)
- `identity.users` (migration `0004`)
- The full role/permission/membership/invitation machinery from BUILD-18
  (`MembershipRepository`, `RoleRepository`, `InvitationRepository`,
  `AuthorizationService`) — no new role or permission was seeded; the
  already-seeded `owner` system role is simply assigned during onboarding.

This build added **one new table** (`onboarding.tenant_onboarding`) to
track wizard progress — nothing else in the frozen schema needed to
change.

## What was built

### 1. Migrations `0138`–`0141`

A new `onboarding` schema with a single table, `onboarding.tenant_onboarding`,
recording one row per onboarding attempt: which tenant/workspace/business/
membership it produced, who initiated it, its current step, and its
terminal status (`in_progress` / `completed` / `abandoned`).

### 2. `packages/database/src/repositories/onboarding/`

Five repositories:

| Repository | Table(s) | Notes |
|---|---|---|
| `TenantRepository` | `tenancy.tenants` | Bootstraps a client-generated UUID through `set_config` to satisfy the self-referential `tenants_isolation` RLS policy (`id = current_setting('app.tenant_id')`) for a brand-new tenant. |
| `WorkspaceRepository` | `tenancy.workspaces` | Only needs the tenant's id set in-session (the policy checks `tenant_id`, not the workspace's own id). |
| `BusinessRepository` | `platform.businesses` | Standard `withTenantTransaction` — ctx is already fully known by the time a business is created. Activates the business immediately (`status = 'active'`) rather than leaving the schema's `draft` default. |
| `SettingsRepository` | `platform.system_settings` | Thin upsert wrapper (no RLS on this table — it also serves platform-wide settings). |
| `OnboardingProgressRepository` | `onboarding.tenant_onboarding` | The state machine: `create`, `getById`, `getByTenant`, `getActiveForUser` (resume lookup), `recordBusinessCreated`/`recordOwnerAssigned`/`recordSettingsApplied`/`recordInvitationsSent` (step advancement, each idempotent on retry and step-order-checked), `markCompleted`, `markAbandoned`. |

### 3. `packages/onboarding` (new package)

`OnboardingService` orchestrates the wizard as a sequence of independently
atomic steps — `beginOnboarding`, `resumeOnboarding`, `setBusiness`,
`assignOwner`, `applyDefaultSettings`, `inviteTeamMembers`,
`completeOnboarding`, `abandonOnboarding` — composing the onboarding
repositories with `@infinicus/database`'s `MembershipRepository` and
`@infinicus/authorization`'s `AuthorizationService` (for role assignment
and invitation creation), never modifying either.

## Why each step is its own transaction, not one big one

`Use atomic transactions... where state changes emit events` (architecture
rule) is satisfied at the level of each individual step, not the whole
wizard — a genuinely single all-or-nothing transaction across
tenant+workspace+business+membership+settings+invitations would make
"resume/retry behavior" (an explicit required scope item) meaningless,
since a mid-flow failure would roll back everything and there would be
nothing to resume. Instead: each step commits durably on success, the
progress row records exactly how far the wizard got, and
`OnboardingProgressRepository`'s idempotency checks (return the existing
result rather than erroring or duplicating) make retrying a step after a
dropped connection safe.

## Architecture rules preserved

- No duplicate infrastructure — reuses the frozen tenant/workspace/business
  tables and the BUILD-18 role/membership/invitation machinery verbatim.
- Server-side enforcement only.
- Tenant isolation is enforced by RLS on every new table exactly as in
  every prior build; the one deliberate deviation (an OR-predicate
  admitting the initiating user in addition to the matching tenant) is
  documented in `security-controls-build19.md` and mirrors an existing
  pattern already used twice in the frozen schema (`tenancy.roles`,
  `audit.access_events`).
- No migrations `0001`–`0137` were modified (byte-identical, verified via
  `git diff --exit-code`).
- No later-build functionality (workflow engine, billing, etc.) was added.

## Out of scope (explicitly not built)

- Any UI/wizard frontend.
- An HTTP layer/API routes (still deferred per root `CLAUDE.md` §4 — same
  boundary as BUILD-18).
- Email delivery for invitations (the invitation *record* and its raw
  token are produced via the existing BUILD-18 `AuthorizationService`;
  actually sending the email is a future integration).
- Billing/plan enforcement beyond storing an optional `planCode` string on
  the tenant (that's a later build's scope, per the master route).
- Multiple workspaces per onboarding attempt — the wizard creates exactly
  one initial workspace; adding further workspaces afterward uses the
  existing `WorkspaceRepository.create()` directly, outside the onboarding
  state machine.
