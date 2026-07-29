# BUILD-19 — Tenant Onboarding: Configuration

## Environment variables

No new environment variables. Reuses `DATABASE_URL` (app_test_user-equivalent,
RLS-enforced) exactly as every prior build. `ADMIN_DATABASE_URL` is
test/migration tooling only, never used at runtime by `OnboardingService`
or any onboarding repository.

## Local test-database grants (environment-specific, not committed)

Every schema this build's repositories touch that was created **before**
this build (`tenancy`, `platform`, `identity`) already had `app_test_user`
granted `USAGE`/`SELECT`/`INSERT`/`UPDATE`/`DELETE` from this project's
original (undocumented, pre-existing) local role provisioning — that
provisioning has never been part of any migration file in 141 migrations,
matching the standing rule that migrations never contain `GRANT`
statements (grants are operational/deployment concerns, not schema
history). The **new** `onboarding` schema this build introduces needed
the same grants applied once, out-of-band, against the local disposable
test database:

```sql
GRANT USAGE ON SCHEMA onboarding TO app_test_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA onboarding TO app_test_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA onboarding TO app_test_user;
ALTER DEFAULT PRIVILEGES FOR ROLE infinicus_test_admin IN SCHEMA onboarding
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_test_user;
ALTER DEFAULT PRIVILEGES FOR ROLE infinicus_test_admin IN SCHEMA onboarding
  GRANT EXECUTE ON FUNCTIONS TO app_test_user;
```

A production deployment's provisioning/ops tooling is responsible for the
equivalent grant on the real application role when this schema is
deployed — this is intentionally not encoded in a migration file, matching
this repository's established convention.

## Package configuration

- New package: `packages/onboarding` (`@infinicus/onboarding`), mirroring
  `packages/authentication`/`packages/authorization`'s `package.json`/
  `tsconfig.json` shape exactly — including the `"require"` export
  condition fix already applied to those two packages in BUILD-18 (needed
  here too, since `@infinicus/onboarding`'s compiled `dist/*.js` uses CJS
  `require()` against `@infinicus/database` and `@infinicus/authorization`).
- `packages/database/package.json` — unchanged (its `"require"` export
  condition was already added in BUILD-18).
- `pnpm-workspace.yaml` already globs `packages/*`, so no workspace
  registration step was needed beyond creating the directory.

## Tunable constants

| Constant | Value | Location |
|---|---|---|
| Default tenant settings | `{ theme: 'system', notificationsEnabled: true, defaultLocale: 'en-US' }` | `packages/onboarding/src/OnboardingService.ts` |
| Onboarding step order | `workspace_created → business_created → owner_assigned → settings_applied → invitations_sent → completed` | `packages/database/src/repositories/onboarding/OnboardingProgressRepository.ts` (`STEP_ORDER`), mirrored in the `onboarding.tenant_onboarding.current_step` CHECK constraint (migration `0138`) |
| Owner role code | `'owner'` | Resolved by `RoleRepository.getByCode` via `AuthorizationService.assignRole`; seeded in BUILD-18's migration `0137` |

These are compile-time constants — no configuration UI or admin-tunable
policy was requested or built (matching BUILD-19's scope).
