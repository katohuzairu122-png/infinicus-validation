# Tenant Isolation

## Model

The INFINICUS platform is multi-tenant. Every tenant-owned record carries a `tenant_id` column that references `tenancy.tenants(id)`. PostgreSQL Row-Level Security enforces tenant isolation at the database level — the application cannot accidentally return cross-tenant data.

## Transaction context

All queries on tenant-owned tables must run inside a `withTenantTransaction()` call:

```ts
import { withTenantTransaction } from '@infinicus/database';

await withTenantTransaction(
  { tenantId, workspaceId, userId },
  async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM platform.businesses',
      []
    );
    return rows;
  }
);
```

Internally this calls:

```sql
SET LOCAL app.tenant_id    = '<tenantId>';
SET LOCAL app.workspace_id = '<workspaceId>';
SET LOCAL app.user_id      = '<userId>';
```

`SET LOCAL` limits the setting to the current transaction only. When the transaction ends, the settings revert — no leakage across connections in the pool.

## RLS policies

Every tenant-owned table has one policy:

```sql
CREATE POLICY <table>_isolation ON <schema>.<table>
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

The `true` flag in `current_setting()` makes the function return `NULL` when the setting is absent rather than raising an error. A `NULL` UUID never equals any stored `tenant_id`, so missing context returns zero rows (safe fail-closed).

Membership queries additionally enforce workspace scope:

```sql
USING (
  tenant_id    = current_setting('app.tenant_id',    true)::uuid
  AND workspace_id = current_setting('app.workspace_id', true)::uuid
)
```

## Migration role vs. application role

Migrations must be applied with a privileged role that bypasses RLS (`BYPASSRLS` attribute, or `SET session_replication_role = replica`). The application role used at runtime must NOT have `BYPASSRLS`.

## Global tables

`identity.users` and `identity.user_profiles` are global — they hold no `tenant_id` and have no RLS. Users are linked to tenants via `tenancy.memberships`.

## System roles

`tenancy.roles` rows with `tenant_id IS NULL` are platform-wide system roles visible to all tenants. The RLS policy allows them:

```sql
USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid)
```

## Workspace scope

Where both tenant and workspace context are required (e.g., `tenancy.memberships`), the policy enforces both. For tables that carry `workspace_id` but do not strictly require workspace-level isolation (e.g., `platform.businesses`), the policy isolates at tenant level only; the application layer may further filter by workspace.

## Audit tables

`audit.access_events` has an optional `tenant_id` (nullable for pre-login events). Its policy allows rows where `tenant_id IS NULL` OR matches the current tenant context.
