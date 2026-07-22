# BUILD-18 — Authentication and Authorization: Architecture and Scope

**Build:** BUILD-18 (AUTH) · **Depends on:** BUILD-17 (completed) · **Status:** Complete

## Purpose

Deliver server-side authentication and authorization on top of the
pre-existing Stage 1 foundation schema — no new schema design, no new
identity provider, no HTTP framework selection. This build is the
repository/service layer that turns the already-frozen
`tenancy`/`identity`/`audit` tables (migrations `0003`, `0004`, `0006`,
`0007`, `0011`) into working authentication and authorization
capabilities.

## What already existed (discovered, not built)

A preflight research pass confirmed the entire RBAC/session/audit schema
was already built and structurally tested (`migration-stage2a.test.ts`,
55 tests) as part of the Stage 1 foundation, long before this build:

- `identity.users`, `identity.user_profiles`, `identity.sessions`,
  `identity.service_accounts`, `identity.api_key_references`
- `tenancy.roles`, `tenancy.permissions`, `tenancy.role_permissions`,
  `tenancy.memberships`, `tenancy.membership_roles`, `tenancy.invitations`
- `audit.access_events`, `audit.entity_versions`, `audit.audit_events`

This build adds **one seed migration** (`0137`) and the repository /
service / guard layer on top — no `CREATE TABLE` statements.

## What was built

### 1. Seed migration

`infrastructure/database/migrations/0137_seed_auth_roles_permissions.sql`
— seeds a 29-permission catalog (9 business layers × read/write/admin,
plus `platform:member_manage` and `platform:admin`) and 4 system roles
(`owner`, `admin`, `member`, `viewer`, `tenant_id IS NULL`, `is_system =
true`) with their role→permission grants, via idempotent
`INSERT … ON CONFLICT DO NOTHING`.

| Role | Permission count |
|---|---|
| owner | 29 (all) |
| admin | 28 (all except `platform:admin`) |
| member | 18 (all `*:read` + `*:write`) |
| viewer | 9 (all `*:read`) |

### 2. `packages/database/src/repositories/auth/`

Nine repositories, following the same tenant-context conventions as
every prior persistence-stage build:

| Repository | Table(s) | Transaction mode |
|---|---|---|
| `UserRepository` | `identity.users`, `identity.user_profiles` | `withTransaction` (no RLS, global) |
| `SessionRepository` | `identity.sessions` | `withTransaction` (no RLS, global) |
| `ServiceAccountRepository` | `identity.service_accounts` | `withTenantTransaction` |
| `ApiKeyRepository` | `identity.api_key_references` | `withTenantTransaction` (tenant must be known upstream — see Known Limitations) |
| `RoleRepository` | `tenancy.roles` | `withTenantTransaction` (system + tenant roles both visible) |
| `PermissionRepository` | `tenancy.permissions`, `tenancy.role_permissions` | `withTransaction` (no RLS, global reference data) |
| `MembershipRepository` | `tenancy.memberships`, `tenancy.membership_roles` | `withTenantTransaction` |
| `InvitationRepository` | `tenancy.invitations` | `withTenantTransaction` |
| `AccessEventRepository` | `audit.access_events` | `withTransaction`, with an in-session `set_config('app.tenant_id', …)` when a non-null tenant is supplied (see Security Controls) |

### 3. `packages/authentication`

- `password.ts` — bcrypt (cost factor 12) hashing, strength validation
  (≥12 chars, ≥3 of {lower, upper, digit, symbol}).
- `tokens.ts` — SHA-256 session-token and API-key hashing (token/key
  entropy is already 256 bits, so a fast deterministic hash is
  appropriate — see Security Controls for the rationale).
- `AuthenticationService` — `register`, `login`, `logout`,
  `validateSession`, `revokeSession`, `revokeAllUserSessions`,
  `changePassword`. Fail-closed: `validateSession` throws a specific
  error (`SessionInvalidError`/`SessionRevokedError`/
  `SessionExpiredError`/`AccountNotActiveError`) rather than returning
  null/false.

### 4. `packages/authorization`

- `invitationTokens.ts` — invitation tokens are structured as
  `${tenantId}:${workspaceId}:${secret}` (not opaque) so tenant context
  can be established before any RLS-scoped database lookup.
- `AuthorizationService` — `hasPermission`, `authorize` (throws
  `PermissionDeniedError`/`MembershipNotActiveError`, records a
  `permission_denied` access event on every denial), `assignRole`,
  `revokeRole`, `createInvitation`, `acceptInvitation`,
  `revokeInvitation`.
- `guards.ts` — `createAuthGuard`, `createPermissionGuard`:
  framework-agnostic functions operating on plain inputs/outputs, ready
  to be wrapped by whichever HTTP framework `apps/api` eventually adopts
  (see Out-of-Scope below).

## Architecture rules preserved

- No duplicate infrastructure — this build reuses the frozen
  `tenancy`/`identity`/`audit` schema rather than creating parallel
  tables.
- Server-side enforcement only — `AuthorizationService.authorize()` is
  fail-closed and the only sanctioned decision point; no client-side
  authorization logic exists anywhere in this build.
- Tenant/workspace isolation is enforced by the database (RLS), not
  re-implemented in application code.
- No migrations 0001–0136 were modified (byte-identical, verified via
  `git diff --exit-code`).
- No later-build functionality (onboarding, workflow engine, billing,
  etc.) was added.

## Out of scope (explicitly not built)

- An HTTP framework for `apps/api` (per root `CLAUDE.md` §4, deferred
  until the base architecture is approved). `guards.ts` is deliberately
  framework-agnostic so a future Fastify/NestJS adapter is a thin
  wrapper, not a rewrite.
- Any external identity provider (OAuth/OIDC/SAML) — this build is
  first-party email/password + service-account API keys only, per the
  frozen schema's actual columns (`password_hash`, no `external_idp_id`
  column exists).
- UI/frontend for login, registration, or invitation acceptance.
- Multi-factor authentication (no schema support exists for it yet).
