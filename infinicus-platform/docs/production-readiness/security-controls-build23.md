# BUILD-23 — Deployment and Environments: Security Controls

## Promotion gate is enforced by code, not policy

`deploy.sh`'s promotion gate (`deployment-audit.cjs check-promotion`)
queries `platform.deployment_events` directly — a version cannot reach
`staging` without a recorded `succeeded` deployment of that *exact*
version to `test` first, and cannot reach `production` without one to
`staging` first. This was live-tested for both the positive case (a
version that legitimately succeeded in the prerequisite environment is
allowed through) and two negative cases: a version with no history at
all is rejected, and — more subtly — a version whose prerequisite
deployment exists but is recorded as `failed` (not `succeeded`) is
**still** correctly rejected, not treated as "close enough."

## No shell-injection surface in the deployment-audit CLI boundary

An earlier draft of `deploy.sh` built its database-audit calls as
inline `node -e '...'` strings with shell variables
(`$VERSION`/`$ENVIRONMENT`/`$DEPLOYED_BY`/caller-supplied `notes`)
interpolated directly into the JavaScript source text — a value
containing a single quote (a commit message, an unusual CI actor name,
anything caller-supplied) could break out of the string and execute
arbitrary code. Caught during this build's own authoring (not by a
user report) and fixed by extracting `deployment-audit.cjs`, a real
Node script that reads every value through `process.argv` — the
bash-to-Node boundary is now always a plain argv element, never
interpolated source, for every value that could plausibly come from an
external or automated caller (CI actor names, commit-derived notes,
etc.).

## `grant-app-role.sh` never re-exposes the deliberately-restricted `public` schema

Every real domain in this codebase lives in its own properly namespaced
schema (`tenancy`, `identity`, `platform`, `api`, ...); `public` holds
only vestigial tables from the very first scaffolding migration,
including `_migrations` itself, which the least-privilege application
role has deliberately never had access to (established and tested
during BUILD-22's `backup.sh` work). `grant-app-role.sh` explicitly
excludes `public` from its schema-discovery query — verified live: after
running the script against a fresh database, `has_table_privilege('app_test_user', 'public._migrations', 'SELECT')`
still returns `false` while every real domain schema returns `true`.

## Docker image runs as a non-root user

`apps/api/Dockerfile` creates a dedicated `infinicus` system user/group
(uid/gid 1001) and switches to it via `USER infinicus` before the final
`CMD` — the containerized process never runs as root, standard
least-privilege container hardening (spec §5).

## No secrets baked into the image or the CI workflow

`.dockerignore` excludes `.env`/`.env.local`/`.env.*.local` from the
build context — no local secret file can be accidentally copied into an
image layer. The CI workflow's own database credentials
(`CI_ADMIN_PASSWORD`/`CI_APP_PASSWORD`) are disposable, local-only
values scoped to a single ephemeral `postgres:16` service container that
does not outlive the job — not real secrets, matching this entire
project's own local-development-credential convention. The built image
receives its real `DATABASE_URL` only at container-start time via `-e`
(an environment variable, never a file baked into a layer or a build
argument that would persist in image history).

## Migration gate reuses BUILD-22's fail-closed advisory lock

`migration-gate.sh` calls `runMigrations()` directly — the same
Postgres session-level advisory lock BUILD-22 added protects a promotion
pipeline racing against, say, a second concurrent promotion attempt or
another process starting up against the same target database, exactly
as it already protects against two application instances racing. No new
concurrency-safety logic was introduced; this build only adds a new
caller of the existing, already-tested mechanism.

## `restore.sh`'s refuse-to-overwrite guard (BUILD-22) extends naturally to rollback

A rollback that restores a database backup (see
`rollback-procedure-build23.md`) inherits BUILD-22's existing safety
guard: `restore.sh` refuses to run against an already-existing target
database, so a rollback operator cannot accidentally overwrite a live
database by mis-targeting the restore.

## Deployment audit is immutable evidence, not a log line that can be edited away

Every `deployment_events` row is append-only in practice — the
repository exposes `start()`/`markSucceeded()`/`markFailed()`/
`markRolledBack()`, never an update to `version`, `environment`, or
`git_sha` after creation, and never a delete. A rejected promotion
attempt (failed gate) is recorded exactly like a successful one — the
audit trail shows attempts, not just successes, satisfying spec §5's
"immutable audit evidence" for the deployment process itself.
