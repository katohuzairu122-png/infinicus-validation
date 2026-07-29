BUILD-22 COMPLETION REPORT — PRODUCTION DATABASE AND RECOVERY

Build ID: BUILD-22
Layer: PROD-DB
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-22-PROD-DB-SPECIFICATION.md
Specification SHA-256: 22557157954d1c9a0c68c3fe2b8db0d9141d9a2c1c2ecbb72b335886b79f45c5
Status: COMPLETE

WHAT WAS BUILT

Every capability in spec §2's required scope, each with genuine, live
execution evidence rather than documentation alone: hardened PostgreSQL
connection pooling (idle/connection/statement timeouts, application_name,
pool utilization stats); a Postgres advisory-lock guard around the
migration runner preventing concurrent-instance races on the
_migrations table and DDL; a new GET /v1/ready readiness endpoint in
apps/api (real SELECT 1 against the pool, 200/503) distinct from the
pre-existing pure-liveness GET /v1/health; and eight new operational
scripts under infrastructure/database/scripts/ covering logical
backup, restore (with an overwrite-refusal safety check), retention
pruning, tenant data export (RLS-scoped, with a BYPASSRLS-refusal
safety check), and a full WAL-archiving + point-in-time-recovery
toolchain. The PITR toolchain was exercised in a genuine live drill
during this build: WAL archiving enabled, a real base backup taken, two
writes made with a recorded timestamp between them, and a recovered
scratch instance verified — both by direct data inspection and by the
Postgres recovery log itself — to contain the first write and correctly
exclude the second, then the cluster was restored to its prior baseline.
This build added zero database migrations; every deliverable is
application code, configuration, or operational scripting.

FILES CREATED

infinicus-platform/infrastructure/database/scripts/backup.sh
infinicus-platform/infrastructure/database/scripts/restore.sh
infinicus-platform/infrastructure/database/scripts/prune-backups.sh
infinicus-platform/infrastructure/database/scripts/export-tenant.sh
infinicus-platform/infrastructure/database/scripts/enable-wal-archiving.sh
infinicus-platform/infrastructure/database/scripts/disable-wal-archiving.sh
infinicus-platform/infrastructure/database/scripts/pitr-base-backup.sh
infinicus-platform/infrastructure/database/scripts/pitr-restore.sh
infinicus-platform/packages/database/tests/migration-locking.integration.test.ts
infinicus-platform/packages/database/tests/backup-restore.integration.test.ts
infinicus-platform/packages/database/tests/export-tenant.integration.test.ts
infinicus-platform/packages/database/tests/prune-backups.test.ts
infinicus-platform/apps/api/tests/readiness.integration.test.ts
infinicus-platform/docs/production-readiness/architecture-and-scope-build22.md
infinicus-platform/docs/production-readiness/configuration-build22.md
infinicus-platform/docs/production-readiness/operating-procedure-build22.md
infinicus-platform/docs/production-readiness/security-controls-build22.md
infinicus-platform/docs/production-readiness/test-evidence-build22.md
infinicus-platform/docs/production-readiness/rollback-procedure-build22.md
infinicus-platform/docs/production-readiness/known-limitations-build22.md

FILES MODIFIED

infinicus-platform/packages/database/src/client.ts (createPool() gained idleTimeoutMillis/connectionTimeoutMillis/statementTimeoutMillis/applicationName options; new poolStats() export)
infinicus-platform/packages/database/src/index.ts (barrel export: poolStats, PoolStats type)
infinicus-platform/packages/database/src/migrate.ts (runMigrations() wrapped in a Postgres session-level advisory lock)
infinicus-platform/packages/configuration/src/index.ts (InfinicusConfig gained dbPoolMin/dbPoolMax/dbIdleTimeoutMs/dbConnectionTimeoutMs/dbStatementTimeoutMs, each with a documented default)
infinicus-platform/packages/configuration/tests/loadConfig.test.ts (extended: pool-tuning default and override coverage)
infinicus-platform/apps/api/src/app.ts (new GET /v1/ready route)
infinicus-platform/apps/api/src/server.ts (createPool() call now passes the new pool-tuning config through)

ARCHITECTURE

No duplicate infrastructure — export-tenant.sh reuses the exact same
current_setting('app.tenant_id', true) RLS mechanism every domain
repository already depends on, discovering the tenant-scoped table set
dynamically from Postgres's own pg_policies catalog rather than
hand-maintaining a second, parallel list. No new schema, table, or RLS
policy was introduced (zero migrations). Full detail:
docs/production-readiness/architecture-and-scope-build22.md.

SECURITY

export-tenant.sh refuses to run against a superuser/BYPASSRLS
connection (queries pg_roles before proceeding) — a real, tested guard
against a cross-tenant data leak, not documentation alone. restore.sh
refuses to overwrite an existing database. DB_STATEMENT_TIMEOUT_MS/
DB_CONNECTION_TIMEOUT_MS/DB_IDLE_TIMEOUT_MS bound query/connection
lifetimes server-side. The migration advisory lock prevents a
torn/partial schema apply under concurrent instance startup. No secrets
are logged, echoed, or embedded in any script's output. Full detail:
docs/production-readiness/security-controls-build22.md.

TENANCY AND AUTHORIZATION

No new authorization logic. export-tenant.sh is scoped entirely by the
existing RLS mechanism (app.tenant_id session GUC); live-tested that a
two-tenant fixture's export contains only the target tenant's data.
Every other read/write path in this build (backup, restore, PITR,
pooling, readiness, migration locking) is either RLS-agnostic
infrastructure or already covered by existing repository-layer
enforcement untouched by this build.

DATABASE CHANGES

None. Zero migrations. Migrations 0001-0145 verified byte-identical
(git status --porcelain on infrastructure/database/migrations/ — empty).

API CHANGES

New: GET /v1/ready (apps/api) — real database-reachability check, 200
with pool stats or 503. GET /v1/health is unchanged (pure liveness).

UI CHANGES

None. This build is backend/operational infrastructure, not a UI
change — apps/web (BUILD-20) is unmodified.

CONFIGURATION

Five new optional environment variables (DB_POOL_MIN, DB_POOL_MAX,
DB_IDLE_TIMEOUT_MS, DB_CONNECTION_TIMEOUT_MS, DB_STATEMENT_TIMEOUT_MS),
each with a documented default matching or close to the pool's
pre-existing implicit behavior — no existing caller's behavior changed
by this build. Eight new operational scripts, each taking its own
explicit environment-variable inputs at invocation time rather than
being folded into InfinicusConfig (a backup/export job's credentials
are deliberately a different role from the running application's own).
Full detail: docs/production-readiness/configuration-build22.md.

OBSERVABILITY

poolStats() (totalCount/idleCount/waitingCount) is now exposed via
GET /v1/ready's response body and available for future dashboarding.
No new audit/outbox events — this build introduces no new
business-data write path.

TESTS

5 new/extended test files: 3 new configuration unit tests, 3 new
filesystem-only unit tests (prune-backups.sh), and 9 new live-database
integration tests (migration locking x2, backup/restore x3,
tenant-export x2, readiness x2). All passing, run twice in succession
to confirm no flakiness after fixing a test-isolation bug discovered
during this build's own testing (see VALIDATION below and
test-evidence-build22.md). Point-in-time recovery was additionally
verified via a genuine, manually-executed live drill (WAL archiving
enabled, base backup taken, two timestamped writes, a real recovered
instance inspected and confirmed correct) — documented in full in
test-evidence-build22.md, deliberately not wired into the automated
suite (see known-limitations-build22.md for why).

VALIDATION

pnpm typecheck: 8/8 packages with a typecheck script pass.
pnpm lint: 23/23 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database, line numbers only
shifted because migrate.ts grew by a few lines).
pnpm build: 23/23 packages build successfully.
Frozen-migration byte-identity: git status --porcelain on
infrastructure/database/migrations/ — clean, zero files.
Four genuine bugs were found and fixed during this build's own live
testing (backup.sh permission requirements against the least-privilege
role, export-tenant.sh's initial assumption that every table is
tenant-scoped, pitr-restore.sh's Debian config-file-location assumption,
and a test-isolation race in backup-restore.integration.test.ts against
the shared database) — full root-cause and fix detail in
test-evidence-build22.md.

ROLLBACK

Zero migrations to roll back. Application-code rollback is a plain
commit revert — every change in this build is additive (new optional
createPool() parameters with existing defaults, new optional
InfinicusConfig fields with existing defaults, a new route, a new
advisory-lock wrapper around the existing migration runner, and eight
entirely new scripts) — no existing repository, service, migration, or
route was modified. Full procedure:
docs/production-readiness/rollback-procedure-build22.md.

REGRESSION RESULTS

packages/database: 28 test files, 2736 passed | 13 skipped (2749 total)
— every prior domain (da, bo, bi, dt, simulation, adi, aba, om, cl,
auth, onboarding, api-idempotency, plus all migration-stage2* structural
suites) passed unchanged, run twice to confirm stability.
packages/configuration: 1 test file, 12 passed.
packages/observability: 1 test file, 5 passed.
packages/authentication: 3 test files, 45 passed | 1 skipped (46 total).
packages/authorization: 2 test files, 25 passed | 1 skipped (26 total).
packages/workflow: 1 test file, 12 passed | 1 skipped (13 total).
packages/onboarding: 1 test file, 12 passed | 1 skipped (13 total).
apps/web: 1 test file, 10 passed.
apps/api: 2 test files, 28 passed | 2 skipped (30 total).

OUT-OF-SCOPE CONFIRMATION

No later-build functionality was implemented. No scheduler/cron
integration for the new scripts (deployment-environment concern, out of
this build's scope per root CLAUDE.md's own infrastructure/database vs.
infrastructure/deployment boundary). WAL archiving was not left
permanently enabled on the shared disposable test cluster (deliberately
reversed after the drill, to avoid an unbounded-growth side effect for
every future build). No real cloud-provider backup/replication
integration (no such provider exists in this environment; the scripts
are provider-agnostic). No file/blob-attachment export (no prior build
has implemented real blob storage yet). No connection-pool load testing
(BUILD-27's stated scope). No frozen migration (0001-0145) or existing
repository/service/route from any prior build was modified.

KNOWN LIMITATIONS

Full detail in docs/production-readiness/known-limitations-build22.md.
Summary: no built-in scheduler for the new scripts; WAL archiving is
off by default on this repository's shared test cluster (verified via
a manual drill, not left permanently enabled); the PITR drill is a
manually-executed, documented, reproducible procedure rather than part
of the automated vitest suite (avoids repeatedly restarting the shared
cluster other packages' tests depend on); no real cloud-provider
backup/replication integration; tenant export covers file metadata but
not underlying blob bytes (no blob storage exists yet); connection-pool
defaults are sensible but not load-tested.

QUEUE TRANSITION

BUILD-22: blocked -> ready -> in_progress -> completed. currentReadyBuild
remains null — BUILD-23 was not readied or started, per explicit
instruction (spec §8, §10).

Commit: (see next commit in this branch)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10 (tracking PR for this branch) — to be updated with this build's summary.
Next build: BUILD-23 (DEPLOY). Not readied. Per BUILD-22 specification
§8/§10, a future session must explicitly re-verify BUILD-23's
preconditions against
docs/implementation-queue/BUILD-23-DEPLOY-SPECIFICATION.md and the
current repository state before marking it ready.
