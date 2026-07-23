#!/usr/bin/env node
// BUILD-26 — Right-to-erasure: permanently deletes one tenant's entire
// data footprint. Reuses the exact same tenant-scoped-table discovery
// mechanism as export-tenant.sh (BUILD-22) — every table with an RLS
// policy referencing app.tenant_id — so this script never drifts out of
// sync with export-tenant.sh's own notion of "which tables are a
// tenant's data" as new domains are added.
//
// Deletion order matters: most FKs in this schema are ON DELETE
// RESTRICT (deliberately — see every migration's own FK definitions),
// so a naive DELETE in table-discovery order would fail on the first
// table another table still references. This script computes a real
// topological sort from pg_constraint's actual FK graph, restricted to
// the discovered tenant-scoped table set, and deletes children before
// the parents they reference.
//
// Drives psql via child_process rather than the `pg` npm driver — this
// script lives under infrastructure/, not inside a workspace package,
// so it has no node_modules of its own; every other script in this
// directory (export-tenant.sh, grant-app-role.sh, backup.sh, ...) is
// psql-based for the same reason.
//
// All tenant-scoped deletes run through the RLS-restricted role with
// app.tenant_id set (DELETE FROM <table>, no WHERE needed — RLS already
// scopes it to exactly that tenant, the same safety property
// export-tenant.sh relies on: even a bug in this script's own logic
// cannot delete another tenant's rows). tenancy.tenants/workspaces
// themselves are not tenant-scoped tables (they ARE the tenant
// identity) and are deleted last via an elevated connection.
//
// Usage:
//   DATABASE_URL="postgresql://app_test_user:pw@host:5432/db" \
//   ADMIN_DATABASE_URL="postgresql://admin_role:pw@host:5432/db" \
//   TENANT_ID="<uuid>" \
//   DELETED_BY="<actor>" \
//     node delete-tenant-data.mjs
//
// Exit code: 0 on success (prints the deletion order and per-table row
// counts), non-zero on any failure.

import { execFileSync } from 'node:child_process';

function psql(connectionString, sql, args = []) {
  return execFileSync('psql', [connectionString, '-tAc', sql, ...args], { encoding: 'utf8' });
}

function psqlTransaction(connectionString, statements) {
  const script = ['\\set ON_ERROR_STOP on', 'BEGIN;', ...statements, 'COMMIT;'].join('\n');
  return execFileSync('psql', [connectionString, '-v', 'ON_ERROR_STOP=1'], { input: script, encoding: 'utf8' });
}

async function main() {
  const { DATABASE_URL, ADMIN_DATABASE_URL, TENANT_ID, DELETED_BY } = process.env;
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!ADMIN_DATABASE_URL) throw new Error('ADMIN_DATABASE_URL is required');
  if (!TENANT_ID) throw new Error('TENANT_ID is required');
  const deletedBy = (DELETED_BY ?? 'unknown').replace(/'/g, "''");

  const isRlsExempt = psql(DATABASE_URL, 'SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user;').trim();
  if (isRlsExempt === 't') {
    throw new Error(
      "DATABASE_URL connects as a role that bypasses row-level security (superuser or BYPASSRLS) — refusing to run, since a bug in this script could then delete every tenant's data instead of just TENANT_ID's. Use the RLS-restricted application role."
    );
  }

  console.log('Discovering tenant-scoped tables (RLS policies referencing app.tenant_id) ...');
  const tablesRaw = psql(
    ADMIN_DATABASE_URL,
    "SELECT DISTINCT schemaname || '.' || tablename FROM pg_policies WHERE qual LIKE '%app.tenant_id%' ORDER BY 1;"
  );
  // tenancy.tenants matches this discovery query too (its own RLS policy
  // is `id = current_setting('app.tenant_id', true)::uuid` — the text
  // "app.tenant_id" appears, but the compared column is `id`, not a
  // `tenant_id` column tenants doesn't have). It's handled explicitly,
  // separately, below — excluded here to avoid double-processing.
  const tenantScopedTables = new Set(
    tablesRaw.split('\n').map((l) => l.trim()).filter(Boolean).filter((t) => t !== 'tenancy.tenants')
  );
  console.log(`Found ${tenantScopedTables.size} tenant-scoped tables.`);

  // SAFETY CHECK: some of these tables' RLS policies use a nullable-
  // tenant pattern (`tenant_id IS NULL OR tenant_id = current_setting(...)`)
  // to make platform-shared rows visible to every tenant (e.g.
  // tenancy.roles' system roles, audit.access_events/
  // observability.error_events' pre-auth events — see BUILD-18/25's own
  // repository doc comments). Relying on RLS visibility ALONE for a
  // blanket `DELETE FROM table` would therefore also delete every OTHER
  // tenant's shared rows through that OR-NULL branch — a real,
  // catastrophic cross-tenant bug this build's own live testing caught
  // (tenancy.roles' system roles blocked deletion via a still-referencing
  // membership_roles row belonging to a DIFFERENT tenant, revealing that
  // this script would otherwise have tried to delete every tenant's
  // shared system roles). Fixed by adding an explicit
  // `WHERE tenant_id = '<TENANT_ID>'` to every table that has a literal
  // tenant_id column (the overwhelming majority) — this always targets
  // only the current tenant's own rows regardless of what RLS
  // additionally admits as visible. The rare few tables scoped
  // indirectly (no literal tenant_id column — e.g.
  // identity.api_key_references, scoped via its owning service
  // account's tenant) keep a blanket DELETE, since their RLS policy
  // itself only ever admits exactly the current tenant's rows (no
  // OR-NULL fallback) — verified per-table, not assumed.
  const columnCheckRaw = psql(
    ADMIN_DATABASE_URL,
    `SELECT schemaname||'.'||tablename FROM pg_policies p
     WHERE qual LIKE '%app.tenant_id%' AND schemaname||'.'||tablename <> 'tenancy.tenants'
       AND EXISTS (
         SELECT 1 FROM information_schema.columns c
         WHERE c.table_schema = p.schemaname AND c.table_name = p.tablename AND c.column_name = 'tenant_id'
       );`
  );
  const tablesWithTenantIdColumn = new Set(columnCheckRaw.split('\n').map((l) => l.trim()).filter(Boolean));
  const tablesScopedIndirectly = [...tenantScopedTables].filter((t) => !tablesWithTenantIdColumn.has(t));
  if (tablesScopedIndirectly.length > 0) {
    console.log(`Tables scoped indirectly (no literal tenant_id column, blanket DELETE relies on RLS): ${tablesScopedIndirectly.join(', ')}`);
  }

  console.log('Computing FK dependency order ...');
  const fkRaw = psql(
    ADMIN_DATABASE_URL,
    `SELECT (tc_ns.nspname || '.' || tc.relname) || '|' || (fc_ns.nspname || '.' || fc.relname)
     FROM pg_constraint c
     JOIN pg_class tc ON tc.oid = c.conrelid
     JOIN pg_namespace tc_ns ON tc_ns.oid = tc.relnamespace
     JOIN pg_class fc ON fc.oid = c.confrelid
     JOIN pg_namespace fc_ns ON fc_ns.oid = fc.relnamespace
     WHERE c.contype = 'f';`
  );

  // Kahn's algorithm: a table can be deleted once every table that
  // references it (its dependents) has already been deleted.
  const dependents = new Map();
  for (const t of tenantScopedTables) dependents.set(t, new Set());
  for (const line of fkRaw.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [from, to] = line.split('|');
    if (tenantScopedTables.has(from) && tenantScopedTables.has(to) && from !== to) {
      dependents.get(to).add(from);
    }
  }

  const deletedSet = new Set();
  const order = [];
  while (order.length < tenantScopedTables.size) {
    let progressed = false;
    for (const table of tenantScopedTables) {
      if (deletedSet.has(table)) continue;
      const blockers = [...dependents.get(table)].filter((d) => !deletedSet.has(d));
      if (blockers.length === 0) {
        order.push(table);
        deletedSet.add(table);
        progressed = true;
      }
    }
    if (!progressed) {
      const remaining = [...tenantScopedTables].filter((t) => !deletedSet.has(t));
      throw new Error(`Cyclic FK dependency detected among tenant-scoped tables, cannot compute a safe delete order: ${remaining.join(', ')}`);
    }
  }

  console.log('Delete order:', order.join(' -> '));

  // Real per-table row counts for the audit record: one counting pass
  // (SELECT count(*)) before the deleting pass, both under the same
  // RLS-scoped tenant context, so the audit trail reports exactly how
  // many rows were actually removed per table, not a placeholder.
  function scopedClause(table) {
    return tablesWithTenantIdColumn.has(table) ? ` WHERE tenant_id = '${TENANT_ID}'` : '';
  }

  const rowCounts = {};
  for (const table of order) {
    const countRaw = psql(DATABASE_URL, `SELECT set_config('app.tenant_id', '${TENANT_ID}', true); SELECT count(*) FROM ${table}${scopedClause(table)};`);
    const lines = countRaw.split('\n').map((l) => l.trim()).filter(Boolean);
    rowCounts[table] = Number(lines[lines.length - 1] ?? '0');
  }

  const deleteStatements = [
    `SELECT set_config('app.tenant_id', '${TENANT_ID}', true);`,
    ...order.map((table) => `DELETE FROM ${table}${scopedClause(table)};`),
  ];
  psqlTransaction(DATABASE_URL, deleteStatements);
  console.log('Tenant-scoped table deletion complete:', JSON.stringify(rowCounts, null, 2));

  const tenantNameRaw = psql(ADMIN_DATABASE_URL, `SELECT name FROM tenancy.tenants WHERE id = '${TENANT_ID}';`).trim();
  const tenantName = tenantNameRaw.length > 0 ? tenantNameRaw.replace(/'/g, "''") : null;

  const finalStatements = [
    `DELETE FROM tenancy.workspaces WHERE tenant_id = '${TENANT_ID}';`,
    `DELETE FROM tenancy.tenants WHERE id = '${TENANT_ID}';`,
    `INSERT INTO platform.data_deletion_events (tenant_id, tenant_name, deleted_by, table_row_counts)
     VALUES ('${TENANT_ID}', ${tenantName ? `'${tenantName}'` : 'NULL'}, '${deletedBy}', '${JSON.stringify(rowCounts)}'::jsonb);`,
  ];
  psqlTransaction(ADMIN_DATABASE_URL, finalStatements);

  console.log(`Deleted tenant ${TENANT_ID} (${tenantName ?? 'unknown name'}).`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
