# @infinicus/database

PostgreSQL client, migration runner, and tenant-isolation transaction helpers for the INFINICUS platform.

## API

```ts
import {
  createPool,
  getPool,
  getDatabasePool,
  query,
  closePool,
  closeDatabasePool,
  runMigrations,
  withTransaction,
  withTenantTransaction,
} from '@infinicus/database';
import type { DbConfig, TenantContext } from '@infinicus/database';
```

### createPool(config: DbConfig): Pool

Initialises the singleton connection pool. Call once at application start.

```ts
createPool({ connectionString: process.env.DATABASE_URL!, ssl: true });
```

### runMigrations(): Promise<void>

Applies pending migrations from `infrastructure/database/migrations/` in file-name order. Skips already-applied files tracked in `_migrations`.

### withTransaction<T>(fn): Promise<T>

Acquires a client, runs `fn` inside `BEGIN … COMMIT`, and rolls back on error.

```ts
const result = await withTransaction(async (client) => {
  await client.query('INSERT INTO ...', [...]);
  return 'ok';
});
```

### withTenantTransaction<T>(ctx, fn): Promise<T>

Same as `withTransaction`, but first sets `app.tenant_id`, `app.workspace_id`, and `app.user_id` as transaction-local settings so RLS policies evaluate correctly.

```ts
await withTenantTransaction(
  { tenantId, workspaceId, userId },
  async (client) => {
    await client.query('SELECT * FROM platform.businesses', []);
  }
);
```

**All queries on tenant-owned tables must use `withTenantTransaction`.**

## Environment variables

| Variable               | Purpose                           |
|------------------------|-----------------------------------|
| `DATABASE_URL`         | Pooled connection string (Neon)   |
| `DIRECT_DATABASE_URL`  | Direct connection for migrations  |

Never commit real credentials. Use `.env.example` as a template.

## Running migrations

```bash
DATABASE_URL=postgres://... node --import tsx packages/database/src/migrate.ts
```

## Running tests

```bash
pnpm --filter @infinicus/database test
```

Tests are structural (file analysis) and do not require a live database.

## Data Acquisition Repositories (Stage 2B)

```ts
import {
  DataSourceRepository,
  ConnectorRepository,
  CollectionRunRepository,
  ValidationResultRepository,
  DataQualityScoreRepository,
  ProvenanceRepository,
  PublicationPackageRepository,
  NotFoundError,
} from '@infinicus/database';
```

All repository methods require a `TenantContext` and use `withTenantTransaction` internally. Throws `NotFoundError` when a record is not found.

```ts
const repo = new DataSourceRepository();
const source = await repo.create(ctx, {
  name: 'CRM Export',
  sourceCode: 'crm-export',
  sourceType: 'api',
  sensitivityLevel: 'internal',
});
```

## Schemas

| Schema | Stage | Tables | Purpose |
|--------|-------|--------|---------|
| `tenancy` | 2A | 8 | Canonical tenant, workspace, RBAC registry |
| `identity` | 2A | 5 | Global user, session, API key management |
| `platform` | 2A | 24 | Core business structures and entities |
| `audit` | 2A | 3 | Append-only audit trail and access events |
| `events` | 2A | 5 | Outbox/inbox transactional event backbone |
| `files` | 2A | 4 | Object storage metadata (no binary blobs) |
| `data_acquisition` | 2B | 36 | Full DA pipeline: sources → collection → quality → publication |
