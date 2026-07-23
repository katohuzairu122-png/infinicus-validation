# BUILD-22 — Production Database and Recovery: Security Controls

## `export-tenant.sh` refuses to run against a role that bypasses RLS

The core risk this script exists to prevent: a superuser or `BYPASSRLS`
role ignores row-level security entirely, regardless of
`--enable-row-security` being passed to `pg_dump` — running the export
as such a role would silently produce a "tenant export" that actually
contains every tenant's data. The script queries
`SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user`
before doing anything else and exits with a clear error if true. This is
a real, tested guard (see `test-evidence-build22.md`), not just a
documentation warning — an operator who accidentally points the script
at an admin connection string gets a hard failure, not a silent
cross-tenant data leak.

## `export-tenant.sh` reuses existing RLS, introduces no new authorization logic

The set of tables a tenant export includes is discovered dynamically
from Postgres's own `pg_policies` catalog (every table with a policy
referencing `app.tenant_id`) — the exact same tenant-isolation mechanism
every domain repository in this codebase already depends on via
`withTenantTransaction()`. This deliberately avoids hand-maintaining a
second, parallel "which tables are tenant data" list that could drift
out of sync with the schema (and, if it drifted incompletely, silently
under- or over-export). Global, non-tenant-scoped tables (e.g.
`identity.users` — a user's identity is platform-wide; tenant membership
is tracked separately in `tenancy.memberships`) are correctly excluded,
verified live during this build's own manual testing.

## `restore.sh` refuses to overwrite an existing (potentially live) database

Before restoring, the script checks whether the target database already
exists and exits with an error rather than restoring over it — verified
by a dedicated test (`backup-restore.integration.test.ts`). Restoring
into an existing database is always an explicit two-step operation (drop
it yourself first, if that is genuinely intended) — never a one-command
accidental overwrite of live data.

## `backup.sh` requires (and documents) a full-read role, not the least-privilege application role

The application's own runtime role (`app_test_user`-equivalent) is
RLS-restricted and deliberately has no grant on bookkeeping tables like
`_migrations` — least privilege, unchanged from every prior build. A
correct backup needs to see every row in every table, so `backup.sh`'s
own header comment states this requirement explicitly, and this build's
own live testing surfaced the exact failure (`permission denied for
table _migrations`) that results from getting it wrong — documented in
`test-evidence-build22.md` so a future operator doesn't have to
rediscover it.

## PITR drill runs on a fully isolated, disposable instance — never the live cluster

`pitr-restore.sh` always starts its recovered instance on a separate
port (`RECOVERY_PORT`) against a copied data directory
(`RECOVERY_DATA_DIR`), never in place of the live cluster. A PITR drill
(routine or incident-response) can never accidentally corrupt or
interrupt production traffic — the live cluster is read-only input (via
its archived WAL and a base backup) to the whole procedure, never
written to.

## Connection-pool hardening reduces exposure to resource-exhaustion and runaway-query failure modes

`DB_STATEMENT_TIMEOUT_MS` (default 30s) is a server-side backstop —
Postgres itself cancels a query exceeding this, independent of any
client-side timeout or bug. `DB_CONNECTION_TIMEOUT_MS` (default 5s)
prevents a single slow/unreachable database from hanging every request
indefinitely instead of failing fast (which the new `/v1/ready` 503 path
then correctly surfaces to an orchestrator). `DB_IDLE_TIMEOUT_MS`
(default 30s) bounds how long an idle connection can sit open,
preventing gradual connection-count creep. None of these are new
authorization controls — they are availability/resource-exhaustion
hardening, listed here because spec §5's "bounded payloads" principle
extends naturally to bounded connection/query lifetimes.

## Migration advisory lock prevents a torn/partial schema apply under concurrency

Two application instances starting simultaneously against a freshly
provisioned (or partially migrated) database previously had no
protection against racing on the same DDL — a lost race could produce a
duplicate-object error or, in the worst case, a partially applied
migration file (some statements committed, the rest failed mid-way).
The advisory lock serializes concurrent `runMigrations()` calls so this
can no longer happen — live-tested with two genuinely concurrent OS
processes (see `test-evidence-build22.md`).

## No secrets in scripts, logs, or errors

None of this build's eight scripts echo, log, or persist a password —
every connection string is passed through as an opaque environment
variable to `psql`/`pg_dump`/`pg_restore`/`pg_basebackup` directly, never
parsed, logged, or embedded in an output filename. `backup.sh`'s and
`export-tenant.sh`'s output filenames include only a database name and
UTC timestamp (or a tenant UUID, not a secret). No script writes a
credential to disk.

## Retention enforcement only deletes files matching this build's own naming convention

`prune-backups.sh` matches strictly on `infinicus-*.dump` (the exact
pattern `backup.sh` produces) — pointed at a shared directory containing
unrelated files, it never touches anything it didn't create, verified by
a dedicated test case.
