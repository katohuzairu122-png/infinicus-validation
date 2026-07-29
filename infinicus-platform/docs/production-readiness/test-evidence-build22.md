# BUILD-22 — Production Database and Recovery: Test Evidence

All tests below were executed against a live local disposable PostgreSQL
16 instance (migrations `0001`–`0145` — this build added none). Every
number below is from an actual `vitest run`/script execution, not
asserted from code review.

## New test files (this build)

| File | Package | Kind | Result |
|---|---|---|---|
| `tests/loadConfig.test.ts` (extended) | `@infinicus/configuration` | Unit | 12 passed (9 pre-existing + 3 new) |
| `tests/migration-locking.integration.test.ts` | `@infinicus/database` | Live integration | 2 passed, 1 skipped (guard) |
| `tests/backup-restore.integration.test.ts` | `@infinicus/database` | Live integration | 3 passed, 1 skipped (guard) |
| `tests/export-tenant.integration.test.ts` | `@infinicus/database` | Live integration | 2 passed, 1 skipped (guard) |
| `tests/prune-backups.test.ts` | `@infinicus/database` | Unit (filesystem only) | 3 passed |
| `tests/readiness.integration.test.ts` | `@infinicus/api` | Live integration | 2 passed, 1 skipped (guard) |

**Totals:** 3 new configuration unit tests, 3 new filesystem unit tests,
9 new live-database integration tests across 5 new/extended files.

## Coverage by requirement (spec §6)

- **Unit tests**: `loadConfig.test.ts` extended with pool-tuning-default
  and pool-tuning-override coverage; `prune-backups.test.ts` covers the
  retention script's own logic without needing a live database.
- **Integration tests**: `migration-locking.integration.test.ts`,
  `backup-restore.integration.test.ts`, `export-tenant.integration.test.ts`,
  `readiness.integration.test.ts` — all exercise the real scripts/routes,
  not reimplementations of their logic.
- **Authorization and tenant-isolation tests**: `export-tenant.integration.test.ts`
  verifies a two-tenant fixture: tenant A's export contains tenant A's
  business code and tenant ID, and contains **neither** tenant B's —
  plus a dedicated test confirming the script refuses to run against a
  BYPASSRLS connection at all.
- **Failure-path tests**: `readiness.integration.test.ts`'s 503 case
  (database genuinely unreachable, not simulated); `backup-restore.integration.test.ts`'s
  refuse-to-overwrite-an-existing-database case; `export-tenant.integration.test.ts`'s
  BYPASSRLS-refusal case.
- **Idempotency tests where relevant**: not newly applicable — this
  build's idempotency-adjacent guarantee is migration locking (a
  concurrent-race protection, tested below), not HTTP idempotency (that
  remains BUILD-21's `api.idempotency_keys`, unchanged and re-verified
  passing in this build's full regression).
- **Migration tests**: this build added zero migrations, so the standard
  "does this migration parse/create objects correctly" tests don't
  apply; instead, migration-locking behavior (the actual new
  migration-adjacent capability) is directly tested (below).
- **Security tests**: the BYPASSRLS-refusal test above; manual
  verification that `export-tenant.sh` correctly excludes the global
  `identity.users` table (see "Manual live verification" below).
- **Regression tests**: full existing suite across every package
  re-run unchanged (below).

## Migration advisory locking — live test detail

`migration-locking.integration.test.ts` spawns **two genuinely separate
OS processes** (not two calls sharing this test file's own connection
pool) against a freshly created scratch database, each running
`runMigrations()` concurrently:

```
✓ two concurrent runMigrations() invocations against a fresh database both succeed with no duplicate or partial application
✓ a held advisory lock blocks a second concurrent acquisition attempt on the same key
```

Verified: both processes exit 0; `_migrations` row count equals the
migration file count exactly (no duplicates); `api.idempotency_keys`
(the very last migration's own table) exists, proving a full, untorn
apply. The second test directly demonstrates the lock's blocking
behavior with a measured 200ms window where a contending session
provably has not acquired the lock the first session still holds.

## Backup and restore — live test detail

`backup-restore.integration.test.ts` runs against its own dedicated,
migrated scratch database (not the shared `infinicus_test` every other
concurrently-running test file also uses — see "Defects found and
fixed" below for why this matters):

```
✓ backup.sh produces a valid, restorable pg_dump archive
✓ restore.sh restores the backup into a fresh database with matching row counts
✓ restore.sh refuses to restore over an already-existing database
```

The produced archive was verified via `pg_restore --list` (real archive
inspection, not a file-existence check) to contain 1000+ TOC entries.
Restored row counts were compared against counts captured at backup
time for `tenancy.tenants`, `identity.users`, and `_migrations` — exact
matches.

## Point-in-time recovery — manual live drill (see rationale in known-limitations)

Executed once, directly, during this build (not wired into the
automated `vitest run` suite — see `known-limitations-build22.md` for
why):

1. `enable-wal-archiving.sh` — `archive_mode` confirmed `on` after
   restart.
2. `pitr-base-backup.sh` — 229 MB base backup taken via `pg_basebackup`.
3. Inserted a marker row (`'before-target'`), captured
   `clock_timestamp()` as the recovery target, waited 2 seconds,
   inserted a second marker row (`'after-target'`), forced
   `pg_switch_wal()` to archive the segment immediately.
4. `pitr-restore.sh` — recovered a scratch instance on port 5433 to the
   captured target time.
5. **Verified**: the recovered instance contains `'before-target'` and
   correctly does **not** contain `'after-target'` — genuine
   point-in-time recovery, not a full-history replay. The recovery log
   independently confirms this: `"recovery stopping before commit of
   transaction ..., time 2026-07-23 08:56:05.44955+00"` (the excluded
   row's insert time) and `"last completed transaction was at log time
   2026-07-23 08:55:57.810149+00"` (the included row's insert time).
   The recovered instance's `tenancy.tenants` (350 rows) and
   `_migrations` (145 rows) counts matched the source exactly,
   confirming the whole database recovered correctly, not just the
   probe table.
6. Recovery instance stopped and removed; probe table dropped from the
   live database; `disable-wal-archiving.sh` run to restore the cluster
   to its prior baseline (`archive_mode = off`) — confirmed via
   `pg_lsclusters` (cluster online, unaffected) and row-count checks
   (`tenancy.tenants` still 350, `_migrations` still 145) after the
   final restart.

## Tenant data export — live test detail

`export-tenant.integration.test.ts`:

```
✓ exports only the target tenant's data, never another tenant's
✓ refuses to run against a superuser/BYPASSRLS connection
```

Manual verification during script development additionally confirmed
`identity.users` (a global, non-tenant-scoped table) is correctly
**excluded** from the dynamically-discovered tenant-scoped table list —
`pg_policies` correctly shows no `app.tenant_id`-referencing policy on
it, since a user's identity is platform-wide while tenant membership is
tracked separately in `tenancy.memberships`.

## Readiness endpoint — live test detail

`readiness.integration.test.ts`, in its own isolated test file
(deliberately, not `apps/api/tests/api.integration.test.ts` — see
`architecture-and-scope-build22.md`'s reasoning about the process-wide
pool singleton):

```
✓ returns 200 with pool stats when the database is reachable
✓ returns 503 when the database is unreachable
```

The 503 case connects to a genuinely nonexistent host/port (not a mock)
with a short `DB_CONNECTION_TIMEOUT_MS` so the test completes quickly
while still exercising a real connection failure.

## Full regression (this build's changes against every prior build)

```
packages/database:       28 test files, 2736 passed | 13 skipped (2749 total)
packages/configuration:   1 test file,     12 passed
packages/observability:   1 test file,      5 passed
packages/authentication:  3 test files,    45 passed | 1 skipped (46 total)
packages/authorization:   2 test files,    25 passed | 1 skipped (26 total)
packages/workflow:        1 test file,     12 passed | 1 skipped (13 total)
packages/onboarding:       1 test file,     12 passed | 1 skipped (13 total)
apps/web:                 1 test file,     10 passed
apps/api:                 2 test files,    28 passed | 2 skipped (30 total)
```

Every prior domain's suite (`da`, `bo`, `bi`, `dt`, `simulation`, `adi`,
`aba`, `om`, `cl`, `auth`, `onboarding`, `api-idempotency`, plus all
`migration-stage2*` structural suites) passed unchanged, run twice in
succession to confirm stability (no flakiness) after the fixes below.

## Static checks

```
pnpm typecheck  → 8/8 packages with a typecheck script pass
pnpm lint       → 23/23 packages pass (0 errors; 5 pre-existing
                  console-statement warnings in packages/database,
                  unrelated to this build — line numbers shifted only
                  because migrate.ts grew by a few lines)
pnpm build      → 23/23 packages build successfully
```

## Frozen-migration byte-identity

```
git status --porcelain infinicus-platform/infrastructure/database/migrations/
→ empty — this build added zero migrations.
```

## Defects found and fixed during this build's own testing

1. **`backup.sh` permission denied against the application role.** The
   first live run used `app_test_user` (the least-privilege,
   RLS-restricted role) and failed with `permission denied for table
   _migrations` — that role deliberately has no grant on bookkeeping
   tables. Fixed by re-running with the admin/full-read role and
   documenting the requirement explicitly in the script's own header
   comment (not a code bug — a genuine, now-documented operational
   requirement).
2. **`export-tenant.sh`'s first design assumed every table is
   tenant-scoped.** An initial manual test dumped `identity.users` and
   saw every user in the database, not just the target tenant's —
   investigation showed `identity.users` correctly has no RLS policy
   referencing `app.tenant_id` (it's a platform-wide identity table, not
   tenant data). Fixed by dynamically discovering the tenant-scoped
   table set from `pg_policies` instead of assuming "every table" or
   hand-maintaining a list — see `security-controls-build22.md`.
3. **`pitr-restore.sh`'s first version failed to start the recovered
   instance** (`could not access the server configuration file
   ".../postgresql.conf": No such file or directory`). Root cause:
   Debian/Ubuntu's PostgreSQL packaging keeps `postgresql.conf`/
   `pg_hba.conf` **outside** `$PGDATA` (under `/etc/postgresql/16/main/`),
   so a `pg_basebackup` copy of `$PGDATA` has neither file, and simply
   reusing the live cluster's external config would have redirected the
   scratch instance back at the live cluster's own data directory via
   its `data_directory` GUC. Fixed by having `pitr-restore.sh` write a
   minimal, fully self-contained `postgresql.conf` and `pg_hba.conf`
   directly into the recovery data directory — exactly what a
   non-Debian PostgreSQL install already has by default.
4. **`backup-restore.integration.test.ts`'s row-count comparison was
   racy against the shared `infinicus_test` database.** The first
   version of this test backed up the shared database, then — in a
   separate `it()` block, executed after other concurrently-running test
   files (e.g. `api-idempotency.integration.test.ts`) had inserted more
   rows — queried "live" source counts and compared them to the
   restored counts, causing a real, reproducible failure (`expected '56'
   to be '66'` for `api.idempotency_keys`). This was a test-isolation
   bug, not a `backup.sh`/`restore.sh` bug: the scripts correctly backed
   up and restored whatever the database contained at backup time; the
   test was comparing against the wrong (later, mutated) baseline.
   Fixed by rewriting the test to run against its own dedicated,
   migrated scratch database that nothing else touches — the same
   isolation pattern already used by `migration-locking.integration.test.ts`.
   Re-ran the full `packages/database` suite twice after the fix with
   no further failures, confirming the race is fully eliminated, not
   just narrowed.
