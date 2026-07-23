# BUILD-23 — Deployment and Environments: Architecture and Scope

**Build:** BUILD-23 (DEPLOY) · **Depends on:** BUILD-22 (completed) · **Status:** Complete

## Purpose

Deliver the deployment/environment layer required for this platform to
actually ship: CI validation, immutable build artifacts, a real enforced
promotion chain across environments, a migration gate, health checks,
smoke tests, rollback, release versioning, and a deployment audit trail
— every piece genuinely built and live-tested, not documented as a
future intention.

## A repository-topology discovery that shaped this build's scope

Before writing anything, inspection (per spec §1.4) found that this
repository's `main` branch predates `infinicus-platform/` entirely and
hosts a completely unrelated static site (Cloudflare Pages/Workers,
`wrangler.toml`, `sw.js`, its own `.github/workflows/deploy.yml`) — the
two diverged at commit `9206d74`, before any of this session's work
began. `infinicus-platform/` exists only on this feature branch. This
build's new CI workflow (`.github/workflows/ci.yml`) is therefore
explicitly path- and branch-scoped (`infinicus-platform/**`,
`claude/**`) so it never runs against or interferes with the unrelated
legacy site's own pipeline.

## Scope interpretation

Spec §2's required scope ("local/test/staging/production environments,
CI validation, immutable builds, promotion gates, migration gate, health
checks, smoke tests, rollback, release versioning, deployment audit")
describes deployment tooling, not a new application feature — no root
`CLAUDE.md` §4 framework gate applies (that section gates *frontend* and
*API HTTP* framework choices specifically; this build's tools — GitHub
Actions, Docker, shell scripts — are standard, implied by CLAUDE.md's
own Node.js/pnpm/Turborepo stack). No user check-in was required.

## What was built

### 1. Release versioning (`version.sh`)

`<package.json version>+sha.<short-sha>[.dirty]` — deterministic per
exact git state, reusing the repository's own declared version rather
than inventing a parallel scheme. This is the tag every other piece of
this build (Docker image, deployment_events rows) keys off.

### 2. Deployment audit (`platform.deployment_events`, migration `0146`)

One new table, platform-scoped (no `tenant_id`) — a deployment is
infrastructure metadata, not tenant business data, the same reasoning
already established for `platform.system_settings`/`feature_flags`
(migration `0005`) and `_migrations` itself, none of which carry
`tenant_id` or RLS. `DeploymentEventRepository` follows the exact
non-tenant `withTransaction()` pattern already established by
`SettingsRepository` for the same reason.

### 3. Immutable builds (`apps/api/Dockerfile`)

Multi-stage (build → runtime), pinned Node 22, non-root user, a real
`HEALTHCHECK` reusing BUILD-22's `/v1/ready`. Tagged by `version.sh`'s
output — the same version string always produces the same image
contents, and a different commit always produces a different tag.

### 4. Migration gate (`migration-gate.sh`)

A thin wrapper around BUILD-22's advisory-locked `runMigrations()` —
zero new migration logic, reused directly. A promotion that can't
migrate the target database cannot proceed.

### 5. Health checks and smoke tests

`GET /v1/health`/`GET /v1/ready` (BUILD-22) are reused, not reimplemented.
`smoke-test.sh` is the concrete, executable definition of "healthy
enough to receive traffic": liveness, readiness, and that the OpenAPI
surface is actually being served.

### 6. Promotion gates — a real enforced chain, not a policy document

`deployment-audit.cjs check-promotion <version> <environment>`: `local`
and `test` have no prerequisite; **`staging` requires this exact version
to already have a `succeeded` deployment to `test`; `production`
requires this exact version to already have a `succeeded` deployment to
`staging`.** This is checked by code and live-tested (including the
negative case — a version that failed its `test` deployment is still
correctly rejected for `staging`), not merely asserted in a document.

`deploy.sh` orchestrates all of the above into one sequence: version →
promotion gate → migration gate → (caller starts/restarts the app) →
smoke test → audit record. See `operating-procedure-build23.md` for the
full worked sequence.

### 7. CI validation (`.github/workflows/ci.yml`)

Two jobs: `validate` (install, lint, typecheck, build, the full live-
database test suite against a `postgres:16` service container,
provisioned via `migration-gate.sh` + the new `grant-app-role.sh`) and
`build-and-smoke-test-image` (builds the real Docker image, runs it for
real with `--network host` against its own `postgres:16` service, waits
for readiness, runs the real `smoke-test.sh` against it). Does not
push/publish the image to any registry — no real container registry or
deployment target is configured in this environment (see
`known-limitations-build23.md`).

### A pre-existing gap this build had to fix to make CI possible: `grant-app-role.sh`

Every schema-level `GRANT` in this project's entire history (going back
through BUILD-19's `onboarding` schema and BUILD-21's `api` schema) was
applied by hand, live, against one long-lived local database — never a
problem until an automated pipeline needs a genuinely fresh, ephemeral
database on every run. `infrastructure/database/scripts/grant-app-role.sh`
is the now-scripted, idempotent version of that manual step: it grants
the least-privilege application role USAGE/CRUD on every schema
migrations create, **deliberately excluding `public`** (which holds only
vestigial tables from the very first scaffolding migration —
`_migrations` and superseded duplicates like `public.tenants` that every
real domain has its own properly namespaced replacement for — the
application role has never had, and should not gain, access there).
Live-verified: a completely fresh database, migrated and granted via
this script, passed the full 2747-test `@infinicus/database` suite
unchanged.

## Architecture rules preserved

- No duplicate infrastructure — `migration-gate.sh` wraps BUILD-22's
  existing `runMigrations()` directly; health checks reuse BUILD-22's
  existing routes; `grant-app-role.sh` reuses the exact grant pattern
  already established (just automated) rather than inventing new
  role/permission semantics.
- Server-side enforcement only — the promotion gate is enforced by code
  querying `platform.deployment_events`, not by a human remembering a
  checklist.
- One new migration only (`0146`), verified byte-identical against
  `0001`–`0145` (`git status --porcelain` clean for everything else).
- No later-build functionality — this build stops at CI/build/promotion/
  audit tooling; it does not implement BUILD-24's secrets management or
  BUILD-25's observability stack.

## Out of scope (explicitly not built)

See `known-limitations-build23.md` for the full list; the headline items
are: the built Docker image is not pushed to any container registry (no
real registry/credentials exist in this environment); GitHub's native
per-environment protection rules (required reviewers, wait timers) are a
one-time repo-admin UI action, documented but not something an API token
can configure; and process supervision (how a real target actually
starts/stops/restarts the new version) is explicitly the caller's
responsibility, not `deploy.sh`'s — that is environment-specific
(systemd/Kubernetes/a PaaS's own mechanism) and out of this build's
scope.
