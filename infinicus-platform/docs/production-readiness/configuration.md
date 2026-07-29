# BUILD-18 — Authentication and Authorization: Configuration

## Environment variables

No new environment variables were introduced by this build. It reuses
the existing database connection configuration:

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | `packages/database` (`createPool`) | Connects as `app_test_user` in this environment — RLS-enforced role. Production deployments must supply a least-privilege application role, never a superuser/bypass-RLS role. |
| `ADMIN_DATABASE_URL` | Test fixtures and migration runner only | Connects as a `BYPASSRLS` role (`infinicus_test_admin` in this environment) — used to seed cross-tenant test fixtures and to run `_migrations`. Never used at runtime by `AuthenticationService`/`AuthorizationService`. |

Both are consumed exactly as documented in every prior persistence-stage
build (`docs/database-stage-2*.md`) — this build adds no new
configuration surface.

## Credentials

Per root `CLAUDE.md` §12 and the repository's standing security rule:
this build introduces no new stored secrets. Specifically:

- Password hashes (`identity.users.password_hash`) are bcrypt digests,
  never plaintext, and the schema comment on that column
  (`-- bcrypt hash only; never plaintext`) is honored exactly.
- Session tokens (`identity.sessions.session_token_hash`) and API keys
  (`identity.api_key_references.key_hash`) are stored only as SHA-256
  hashes. The raw token/key is generated, returned to the caller exactly
  once, and never persisted anywhere.
- No `.env` file, fixture, or test file in this build contains a real
  credential. Local disposable test credentials
  (`app_test_user`/`local_app_pw`, `infinicus_test_admin`/`local_admin_pw`)
  are supplied only as shell environment variables in ephemeral test
  commands, exactly as in every prior build.

## Package configuration changes

- `packages/authentication/package.json` — added `@infinicus/database`
  (workspace dependency) and `bcryptjs` (`^2.4.3`) as dependencies;
  added `vitest` and `@types/bcryptjs` as devDependencies; added a
  `typecheck` script.
- `packages/authorization/package.json` — added `@infinicus/database`
  as a dependency; added `pg`/`@types/pg` (test-only, for direct
  tenant/workspace fixture setup) and `vitest` as devDependencies; added
  a `typecheck` script.
- `packages/database/package.json`, `packages/authentication/package.json`,
  `packages/authorization/package.json` — each package's `exports` map
  gained a `"require"` condition alongside `"import"` (both pointing at
  the same compiled `dist/index.js`, which is CommonJS output under this
  repo's `module: Node16` TypeScript configuration). Without this, any
  package requiring another workspace package via CJS `require()` (as
  the compiled `dist/*.js` files do) failed with
  `ERR_PACKAGE_PATH_NOT_EXPORTED` — this surfaced for the first time in
  this build because it is the first build with a cross-package
  dependency chain (`authorization` → `authentication` → `database`)
  exercised outside of `packages/database`'s own test suite.

## Tunable constants

| Constant | Value | Location |
|---|---|---|
| bcrypt cost factor | 12 | `packages/authentication/src/password.ts` |
| Minimum password length | 12 characters | `packages/authentication/src/password.ts` |
| Minimum password character classes | 3 of {lower, upper, digit, symbol} | `packages/authentication/src/password.ts` |
| Session token TTL | 24 hours | `packages/authentication/src/tokens.ts` (`defaultSessionExpiry`) |
| Invitation TTL | 7 days | `packages/authorization/src/invitationTokens.ts` (`defaultInvitationExpiry`) |
| Session token entropy | 32 random bytes (256 bits) | `packages/authentication/src/tokens.ts` |
| API key secret entropy | 32 random bytes (256 bits) | `packages/authentication/src/tokens.ts` |

These are compile-time constants, not environment-configurable, matching
this build's scope (no configuration UI or admin-tunable policy was
requested or built).
