# Database Implementation Status

## Current stage

**Stage 2A — Shared Persistence Foundation** — COMPLETE

---

## Completed work

### Stage 1 — Foundation (migration 0001)

| Table              | Purpose                                    |
|--------------------|--------------------------------------------|
| `_migrations`      | Migration registry (idempotent)            |
| `tenants`          | Multi-tenancy root (superseded by tenancy.tenants) |
| `workspaces`       | Logical grouping (superseded by tenancy.workspaces) |
| `users`            | Platform users (superseded by identity.users) |
| `workspace_members`| User ↔ workspace RBAC join                 |
| `businesses`       | Core business entity (superseded by platform.businesses) |
| `audit_log`        | Append-only mutation trail                 |
| `platform_events`  | Append-only PlatformEvent<T> store         |

### Stage 2A — Shared Persistence Foundation (migrations 0002–0012)

#### New PostgreSQL schemas

| Schema    | Tables | Purpose |
|-----------|--------|---------|
| `tenancy` | 8      | Canonical multi-tenant registry, RBAC |
| `identity`| 5      | Global user identity, sessions, API key refs |
| `platform`| 24     | Core business structures + canonical entities |
| `audit`   | 3      | Append-only audit trail and access events |
| `events`  | 5      | Transactional outbox/inbox event backbone |
| `files`   | 4      | Object storage metadata (no binary blobs) |

**Total Stage 2A tables: 49 across 6 schemas**

#### TypeScript helpers added

- `withTransaction()` — generic transactional client
- `withTenantTransaction()` — sets `app.tenant_id`, `app.workspace_id`, `app.user_id` before executing
- `getDatabasePool()` / `closeDatabasePool()` — API-name aliases
- `TenantContext` interface exported

#### Shared-types additions

- `TenantId`, `WorkspaceId`, `BusinessId`, `CorrelationId` — branded ID types

#### Seed files

- `infrastructure/database/seeds/0001_system_roles.sql` — system roles and sample permissions (dev only)

---

## Files changed (Stage 2A)

| File | Change |
|------|--------|
| `infrastructure/database/migrations/0002–0012.sql` | Created — 11 migration files |
| `infrastructure/database/seeds/0001_system_roles.sql` | Created — dev seed |
| `packages/database/src/client.ts` | Updated — `withTransaction`, `withTenantTransaction`, `TenantContext` |
| `packages/database/src/index.ts` | Updated — exports all new helpers |
| `packages/database/README.md` | Created |
| `packages/database/tests/migration-stage2a.test.ts` | Created — structural tests for 0002–0012 |
| `packages/database/tests/transaction-helpers.test.ts` | Created — unit tests for tx helpers |
| `packages/shared-types/src/index.ts` | Updated — branded ID types |
| `docs/database-stage-2a.md` | Created |
| `docs/database-schema-map.md` | Created |
| `docs/tenant-isolation.md` | Created |
| `docs/database-backup-restore.md` | Created |
| `docs/database/IMPLEMENTATION_STATUS.md` | Updated (this file) |

---

## Migrations created

| File | Status |
|------|--------|
| `0001_foundation.sql` | Validated (structural tests pass) |
| `0002_create_extensions.sql` | Validated (structural tests pass) |
| `0003_create_tenancy_schema.sql` | Validated |
| `0004_create_identity_schema.sql` | Validated |
| `0005_create_platform_schema.sql` | Validated |
| `0006_create_audit_schema.sql` | Validated |
| `0007_create_events_schema.sql` | Validated |
| `0008_create_files_schema.sql` | Validated |
| `0009_create_canonical_entities.sql` | Validated |
| `0010_create_indexes.sql` | Validated |
| `0011_create_rls_policies.sql` | Validated |
| `0012_create_updated_at_triggers.sql` | Validated |

---

## Known blockers

- No live PostgreSQL instance in the current environment — migrations cannot be applied until one is provisioned (Neon project or local Docker PG).
- Structural tests pass without a live database. Integration/constraint tests require a live database.

---

## Exact next task

**Stage 2B — Data Acquisition Layer (DAL) schema**

Tables to add:
- `data_acquisition.data_sources`
- `data_acquisition.ingestion_jobs`
- `data_acquisition.ingestion_records`
- `data_acquisition.data_quality_rules`

Start only when instructed.
