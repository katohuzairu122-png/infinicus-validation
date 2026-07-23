/**
 * Live PostgreSQL 16 test for BUILD-26's right-to-erasure requirement:
 * infrastructure/database/scripts/delete-tenant-data.mjs. Creates a real
 * scratch tenant with cross-schema data, runs the real script (not a
 * reimplementation), and verifies: (a) the tenant's own data is fully
 * gone, (b) a real audit record was written, and — the critical safety
 * property this build's own live testing caught a bug in — (c) every
 * OTHER tenant's data, and every platform-shared row (system roles),
 * survives completely untouched.
 *
 * Requires:
 *   DATABASE_URL       — app_test_user (RLS enforced)
 *   ADMIN_DATABASE_URL — infinicus_test_admin (BYPASSRLS)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);
const run = !!process.env.DATABASE_URL;

const DELETE_SCRIPT = resolve(__dirname, '../../../infrastructure/database/scripts/delete-tenant-data.mjs');

describe.runIf(run)('delete-tenant-data.mjs — live PostgreSQL', () => {
  let adminPool: Pool;

  beforeAll(() => {
    adminPool = new Pool({ connectionString: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await adminPool.end();
  });

  it('deletes a tenant\'s full data footprint while leaving other tenants and shared system roles untouched', async () => {
    const tenantId = randomUUID();
    const workspaceId = randomUUID();
    const otherTenantId = randomUUID();
    const otherWorkspaceId = randomUUID();

    // Two tenants: one to delete, one that must survive untouched — the
    // real regression this build's own testing caught (a blanket DELETE
    // relying only on RLS visibility would have deleted every tenant's
    // shared system roles via tenancy.roles' nullable-tenant policy).
    await adminPool.query(
      `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code) VALUES ($1,'Delete-Me Tenant',$2,'active','test')`,
      [tenantId, `delete-me-${tenantId}`]
    );
    await adminPool.query(
      `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status) VALUES ($1,$2,'Delete-Me WS',$3,'active')`,
      [workspaceId, tenantId, `delete-me-ws-${tenantId}`]
    );
    await adminPool.query(
      `INSERT INTO platform.businesses (id, tenant_id, workspace_id, legal_name, business_code, status, industry, correlation_id)
       VALUES ($1,$2,$3,'Delete-Me Biz','DEL-BIZ',$4,'tech',gen_random_uuid())`,
      [randomUUID(), tenantId, workspaceId, 'active']
    );

    await adminPool.query(
      `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code) VALUES ($1,'Survivor Tenant',$2,'active','test')`,
      [otherTenantId, `survivor-${otherTenantId}`]
    );
    await adminPool.query(
      `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status) VALUES ($1,$2,'Survivor WS',$3,'active')`,
      [otherWorkspaceId, otherTenantId, `survivor-ws-${otherTenantId}`]
    );

    const systemRolesBefore = await adminPool.query(`SELECT count(*)::int AS n FROM tenancy.roles WHERE tenant_id IS NULL`);

    const { stdout } = await execFileAsync('node', [DELETE_SCRIPT], {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        ADMIN_DATABASE_URL: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL,
        TENANT_ID: tenantId,
        DELETED_BY: 'vitest-integration-test',
      },
    });
    expect(stdout).toContain(`Deleted tenant ${tenantId}`);

    const tenantGone = await adminPool.query('SELECT count(*)::int AS n FROM tenancy.tenants WHERE id = $1', [tenantId]);
    const workspaceGone = await adminPool.query('SELECT count(*)::int AS n FROM tenancy.workspaces WHERE tenant_id = $1', [tenantId]);
    const businessGone = await adminPool.query('SELECT count(*)::int AS n FROM platform.businesses WHERE tenant_id = $1', [tenantId]);
    expect(tenantGone.rows[0].n).toBe(0);
    expect(workspaceGone.rows[0].n).toBe(0);
    expect(businessGone.rows[0].n).toBe(0);

    const otherTenantSurvives = await adminPool.query('SELECT count(*)::int AS n FROM tenancy.tenants WHERE id = $1', [otherTenantId]);
    const otherWorkspaceSurvives = await adminPool.query('SELECT count(*)::int AS n FROM tenancy.workspaces WHERE tenant_id = $1', [otherTenantId]);
    expect(otherTenantSurvives.rows[0].n).toBe(1);
    expect(otherWorkspaceSurvives.rows[0].n).toBe(1);

    const systemRolesAfter = await adminPool.query(`SELECT count(*)::int AS n FROM tenancy.roles WHERE tenant_id IS NULL`);
    expect(systemRolesAfter.rows[0].n).toBe(systemRolesBefore.rows[0].n);

    const auditRow = await adminPool.query(
      'SELECT tenant_name, deleted_by FROM platform.data_deletion_events WHERE tenant_id = $1',
      [tenantId]
    );
    expect(auditRow.rows).toHaveLength(1);
    expect(auditRow.rows[0].tenant_name).toBe('Delete-Me Tenant');
    expect(auditRow.rows[0].deleted_by).toBe('vitest-integration-test');

    // Cleanup the surviving fixture tenant (not touched by the script under test).
    await adminPool.query('DELETE FROM tenancy.workspaces WHERE tenant_id = $1', [otherTenantId]);
    await adminPool.query('DELETE FROM tenancy.tenants WHERE id = $1', [otherTenantId]);
  }, 60_000);

  it('refuses to run against a BYPASSRLS/superuser DATABASE_URL', async () => {
    await expect(
      execFileAsync('node', [DELETE_SCRIPT], {
        env: {
          ...process.env,
          DATABASE_URL: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL,
          ADMIN_DATABASE_URL: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL,
          TENANT_ID: randomUUID(),
        },
      })
    ).rejects.toThrow();
  });
});

describe.skipIf(run)('delete-tenant-data.mjs — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
