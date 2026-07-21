# Database Stage 2A

## Objective

Stage 2A establishes the canonical shared persistence layer for the INFINICUS platform. It creates six PostgreSQL schemas containing identity, tenancy, platform structure, audit, events, and file metadata — plus the canonical enterprise entity foundation shared by all nine business layers.

## Scope

- Six named schemas: `tenancy`, `identity`, `platform`, `audit`, `events`, `files`
- Canonical foundation tables for customers, suppliers, employees, products, services, orders, invoices, payments, inventory, warehouses, assets, metrics, simulations, decisions, approved actions, outcomes, and learning items
- Tenant-isolation via PostgreSQL RLS on every tenant-scoped table
- `withTenantTransaction()` helper that applies transaction-local context before executing queries
- Development seed for system roles and sample permissions

## What is NOT in Stage 2A

- Data Acquisition schema (`data_sources`, `ingestion_jobs`, etc.) — Stage 2B
- Business Operations schema — Stage 2C
- Business Intelligence schema — Stage 2D
- Digital Twin, Simulation, ADI, ABA, OM, CL schemas — later stages
- Block TypeScript conversion
- Authentication UI or provider integration
- Event-bus infrastructure deployment

## Migration sequence

| File | Purpose |
|------|---------|
| `0001_foundation.sql`              | Stage 1: root tables, `_migrations` registry |
| `0002_create_extensions.sql`       | `pgcrypto` + `citext` |
| `0003_create_tenancy_schema.sql`   | tenancy schema: tenants, workspaces, roles, permissions, memberships, invitations |
| `0004_create_identity_schema.sql`  | identity schema: users, profiles, service accounts, API key refs, sessions |
| `0005_create_platform_schema.sql`  | platform schema: businesses, org units, departments, locations, settings, flags |
| `0006_create_audit_schema.sql`     | audit schema: audit events, entity versions, access events |
| `0007_create_events_schema.sql`    | events schema: outbox, inbox, dead letter, subscriptions, delivery attempts |
| `0008_create_files_schema.sql`     | files schema: file objects, versions, links, access events |
| `0009_create_canonical_entities.sql` | canonical entities in platform schema |
| `0010_create_indexes.sql`          | performance indexes across all schemas |
| `0011_create_rls_policies.sql`     | RLS policies on all tenant-scoped tables |
| `0012_create_updated_at_triggers.sql` | `updated_at` triggers on mutable tables |

## Running migrations

```bash
DIRECT_DATABASE_URL=postgres://... node --import tsx packages/database/src/migrate.ts
```

## Running tests

```bash
pnpm --filter @infinicus/database test
```

## Security notes

- `identity.users` is a global table (no RLS, no tenant_id). Memberships link users to tenants.
- `identity.api_key_references` stores only `key_hash` (SHA-256). Raw keys are never persisted.
- `identity.sessions` stores only `session_token_hash`. Raw tokens are never persisted.
- `tenancy.invitations` stores only `invitation_token_hash`. Raw tokens are never persisted.
- Audit tables are append-only by convention. The application role must not be granted `UPDATE` or `DELETE` on `audit.*`.
