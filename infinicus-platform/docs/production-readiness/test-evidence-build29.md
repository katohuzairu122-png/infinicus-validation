# BUILD-29 — Incident Response and Rollback: Test Evidence

## Repository layer (`packages/database/tests/incident-repository.integration.test.ts`)

7 live tests against real PostgreSQL, including:
- Declaring an incident produces an initial `investigating` status and a genuine first timeline entry (not a placeholder).
- An invalid severity value is rejected by the database `CHECK` constraint.
- A full lifecycle walk — `investigating → identified → monitoring → resolved` — with each transition's timeline entry verified in order, and the incident's own `status` column confirmed to stay in sync with the latest entry.
- Adding an update to, or resolving, an already-resolved incident is rejected (`PlatformIncidentAlreadyResolvedError`), verified for both operations independently.
- Operations against a nonexistent incident id are rejected (`PlatformIncidentNotFoundError`) for `getById`, `addUpdate`, and `resolve` independently.
- `listActive()` genuinely excludes resolved incidents (not just filters by a stale flag) and `listBySeverity()` filters correctly, verified against two incidents created in the same test (one left active, one resolved).
- `affected_systems`/`affected_tenant_ids` (a text array and a uuid array respectively) round-trip correctly through the repository's row-mapping.

## HTTP layer (`apps/api/tests/incidents.integration.test.ts`)

4 live tests booting the real Fastify app and exercising it over real HTTP, including:
- The full lifecycle end-to-end over HTTP: declare (`201`) → appears in `GET /v1/incidents`' active list → post an `identified` update (`201`) → resolve with a postmortem URL (`200`) → the incident disappears from the active list → `GET /v1/incidents/:id/updates` returns the complete timeline in order (`investigating`, `identified`, `resolved`).
- `POST /v1/incidents` is rejected `403` for a `viewer`-role member — the permission gate genuinely enforced over real HTTP, not just documented.
- Resolving an already-resolved incident returns `409` over real HTTP (not just at the repository layer).
- `GET /v1/incidents/:id` for a nonexistent id returns `404`.

## Genuine defects found and fixed during this build's development

1. **Naming collision**: `IncidentRepository`/`Incident` were already exported from `packages/database`'s barrel (`business_operations.IncidentRepository`, BUILD-08 — a workplace/operational-incident concept within a tenant's business data, a different thing from this build's platform/system incident). The very first `tsc` build of the new repository failed with `TS2300: Duplicate identifier`. Fixed by renaming every new class/type/error to `PlatformIncident*` throughout (file, class, and barrel-export names), documented in the new repository's own file-level comment so the reason is visible to a future reader, not just in this doc.
2. **`events.outbox_events.tenant_id` is `NOT NULL`**: an initial migration draft added `platform.emit_incident_declared()`/`emit_incident_resolved()` outbox-emission functions, following the same `emit_outbox_event()` pattern used by every tenant-scoped domain. Caught before any live test ran, by checking `events.outbox_events`' actual schema (migration `0007`) — a platform-wide incident has no single owning tenant, so it cannot be represented in a table whose `tenant_id` column is mandatory. Confirmed this is an established, correct precedent (neither `platform.deployment_events` (BUILD-23) nor `platform.secret_rotation_events` (BUILD-24) emit outbox events, for the identical reason) and removed the functions rather than inventing a sentinel-tenant workaround.
3. **Runbook commands initially used invented environment-variable names.** The first drafts of `restore-procedure.md` and `security-incident.md` referenced `TARGET_TIME`/`<role> <new-password>`-style invocations that do not match `pitr-restore.sh`'s actual `RECOVERY_TARGET_TIME` variable or `rotate-db-credential.sh`'s actual `ADMIN_DATABASE_URL`/`APP_ROLE`/`DB_HOST`/`DB_PORT`/`DB_NAME`/`ENVIRONMENT` invocation. Caught by reading each script's own `# Usage:` header comment before finalizing the runbook text — a runbook with a command that doesn't actually match the tool it references is worse than no runbook, since it fails silently for a responder trying to follow it under pressure.

## Full regression (this build's changes only — no unrelated regressions)

```
pnpm turbo run build      → 57/57 tasks successful
pnpm turbo run lint       → included above, 0 errors
pnpm turbo run typecheck  → included above, 0 errors
```

Standalone per-package test runs (avoiding a transient resource-contention flake seen once when running every affected package concurrently via a single combined `turbo run test` — two unrelated pre-existing test files timed out under that concurrent load and passed cleanly both in isolation and in a full standalone `packages/database` run immediately after, confirming it was contention, not a regression from this build's changes):

```
packages/database (standalone): 40 test files, 2812 passed | 25 skipped (0 failed)
apps/api (standalone):          10 test files,   54 passed | 10 skipped (0 failed)
packages/billing (standalone):   1 test file,    11 passed |  1 skipped (0 failed)
```
