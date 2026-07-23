# BUILD-24 — Secrets and Configuration Management: Test Evidence

## New tests

```
packages/database/tests/secret-rotation-events.integration.test.ts        8 tests (7 run, 1 CI-skip guard)
packages/database/tests/secret-rotation-audit-cli.integration.test.ts     6 tests (5 run, 1 CI-skip guard)
packages/configuration/tests/secrets.test.ts                             16 tests
packages/configuration/tests/loadConfig.test.ts                          +3 tests (production-guard cases)
packages/observability/tests/logger.test.ts                              +4 tests (redaction)
apps/web/tests/browser-secret-check.integration.test.ts                   4 tests
```

## Live drills (genuinely executed against the local dev database, not simulated)

### DB credential rotation

1. Created a scratch role `scratch_rotation_role LOGIN PASSWORD 'original_pw_123'`.
2. Ran `rotate-db-credential.sh` for real (`NEW_PASSWORD=rotated_pw_456`).
3. **Verified the old password is rejected**: `psql` with `original_pw_123` → `FATAL: password authentication failed for user "scratch_rotation_role"`.
4. **Verified the new password works**: `psql` with `rotated_pw_456` → `SELECT 1` succeeds.
5. **Verified the audit record**: `platform.secret_rotation_events` row present with correct `secret_name`, `environment`, `rotated_by`, `expires_at`, `notes`.
6. **Verified `VALID UNTIL` is enforced by Postgres itself**: re-rotated with an already-past `VALID UNTIL` (`2020-01-01T00:00:00Z`) and confirmed a subsequent login attempt is genuinely refused (`FATAL: password authentication failed`) — not merely a documented policy.
7. Cleaned up: dropped the scratch role, deleted its audit rows.

### `secret-rotation-audit.cjs check-expiration`

- Secret expiring in 5 days, 30-day warning window → **exit 1**, correct message.
- Secret expiring in 90 days, 30-day warning window → **exit 0**, correct message.
- Secret never rotated → **exit 0** ("nothing to check").
- Confirmed via the automated CLI integration test (`secret-rotation-audit-cli.integration.test.ts`), which additionally covers the no-recorded-expiry failure case.

### `check-no-browser-secrets.mjs`

- Ran against this repository's real `apps/web`/`apps/admin` source → **pass**.
- Ran against a fixture with `process.env.NEXT_PUBLIC_DATABASE_URL` → **caught**, correct diagnostic naming the secret.
- Ran against a fixture with a `'use client'` file reading `process.env.DATABASE_URL` directly (no `NEXT_PUBLIC_` prefix) → **caught**, correct diagnostic.
- Ran against a fixture with a server component (no `'use client'`) reading `process.env.DATABASE_URL` → **pass** (correctly not flagged — Next.js never inlines it, and it's a legitimate server-side read).

### Log redaction

- `config.databaseUrl` and `req.headers.authorization` redacted to `[REDACTED]` regardless of value, by default, with no caller opt-in — verified by capturing the real pino output stream (`packages/observability/tests/logger.test.ts`).
- Unrelated fields (`route`, `statusCode`) pass through unredacted.
- Caller-supplied `redactPaths` merge with the defaults rather than replacing them.

## Full regression (this build's changes against every prior build)

```
packages/database:        33 test files, 2764 passed | 18 skipped (2782 total)
packages/configuration:     2 test files,   31 passed
packages/observability:     1 test file,     9 passed
packages/authentication:    3 test files,   45 passed | 1 skipped (46 total)
packages/authorization:     2 test files,   25 passed | 1 skipped (26 total)
packages/onboarding:        1 test file,    12 passed | 1 skipped (13 total)
packages/workflow:          1 test file,    12 passed | 1 skipped (13 total)
apps/web:                   2 test files,   14 passed
apps/api:                   4 test files,   32 passed | 4 skipped (36 total)
```

Every prior domain's suite (`da`, `bo`, `bi`, `dt`, `simulation`, `adi`, `aba`, `om`, `cl`, `auth`, `onboarding`, `api-idempotency`, plus all `migration-stage2*` structural suites, plus every BUILD-22/23 script test) passed unchanged.

A single transient timeout in `packages/onboarding`'s test suite occurred when running all filtered packages concurrently under `turbo run test` (resource contention on the shared local Postgres cluster, unrelated to this build's changes — `packages/onboarding` was not touched) — re-ran that suite in isolation and it passed 12/12 (1 skip). Re-ran the full filtered command a second time afterward with everything passing, confirming the flake.

## Static checks

```
pnpm typecheck  → 26/26 tasks pass
pnpm lint       → 23/23 packages pass (0 errors; 5 pre-existing
                  console-statement warnings in packages/database,
                  unrelated to this build)
pnpm build      → 23/23 packages build successfully
```

## Frozen-migration byte-identity

```
git status --porcelain infrastructure/database/migrations/
→ only 0147_create_secret_rotation_events.sql is new — 0001-0146 untouched.
```

## Empty-database install test

Applied migrations `0001`–`0147` to the local dev database in one pass (continuing from the prior `0146` baseline): `0147` applied cleanly, `platform.secret_rotation_events` verified present with its index.

## Migration idempotency

Migration gate re-run reports `skip` for `0147` on a second invocation against the already-migrated database (same mechanism as every prior build's idempotency check).
