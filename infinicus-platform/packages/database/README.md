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

## Schemas (Stage 2A)

| Schema    | Purpose                                    |
|-----------|--------------------------------------------|
| `tenancy` | Canonical tenant, workspace, RBAC registry |
| `identity`| Global user, session, API key management   |
| `platform`| Core business structures and entities      |
| `audit`   | Append-only audit trail and access events  |
| `events`  | Outbox/inbox transactional event backbone  |
| `files`   | Object storage metadata (no binary blobs)  |
