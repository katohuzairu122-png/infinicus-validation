# Data Acquisition — Row-Level Security

## Overview

All tenant-owned DA tables enforce RLS using transaction-local settings set by `withTenantTransaction`. The pattern is identical to Stage 2A.

## Transaction Context

Three settings are required before any DA query:

```sql
SELECT set_config('app.tenant_id',    '<uuid>', true);
SELECT set_config('app.workspace_id', '<uuid>', true);
SELECT set_config('app.user_id',      '<uuid>', true);
```

The `true` parameter makes these transaction-local — they are cleared when the transaction ends.

## Policy Pattern

Standard workspace-scoped policy:

```sql
CREATE POLICY <table>_isolation ON data_acquisition.<table>
  USING (
    tenant_id    = current_setting('app.tenant_id',    true)::uuid
    AND workspace_id = current_setting('app.workspace_id', true)::uuid
  );
```

Tenant-only policy (detail tables with tenant_id but no workspace_id):

```sql
CREATE POLICY <table>_isolation ON data_acquisition.<table>
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
  );
```

## Fail-Closed Behavior

`current_setting('app.tenant_id', true)` returns NULL when the setting is absent (the `true` argument enables the null-safe form). Comparing `NULL::uuid = <any uuid>` always returns false in PostgreSQL, so no rows are accessible if tenant context is missing.

## Detail Tables Without Direct tenant_id

Some detail tables (`detected_fields`, `validation_issues`, `cleaning_actions`) carry explicit `tenant_id` columns added beyond the minimal spec. This enables direct tenant-level RLS policies without requiring subquery joins to their parent tables, which would bypass index scans.

## Application Role Configuration

The application role must be granted:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA data_acquisition TO app_role;
```

Immutable tables (`provenance_records`, `transformation_records`, `webhook_receipts`, etc.) should be limited to INSERT + SELECT only at the role level for defense-in-depth.

## No Superuser in Application Path

Never use a superuser connection for application queries. Superusers bypass RLS. The `SECURITY DEFINER` outbox functions execute with the function owner's privileges, which is expected — they insert into `events.outbox_events` cross-schema.

## Workspace Isolation

The workspace dimension prevents cross-workspace data leakage within the same tenant. A user with access to workspace A cannot read workspace B records even if they share a tenant_id.
