/**
 * Live PostgreSQL 16 test for BUILD-22's tenant data-export requirement
 * (infrastructure/database/scripts/export-tenant.sh). Actually invokes
 * the real script, not a reimplementation of its logic.
 *
 * Requires:
 *   DATABASE_URL       — app_test_user (RLS enforced)
 *   ADMIN_DATABASE_URL — infinicus_test_admin (BYPASSRLS), fixture setup only
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const run = !!process.env.DATABASE_URL;

const EXPORT_SH = resolve(__dirname, '../../../infrastructure/database/scripts/export-tenant.sh');

const T1 = '99999999-a0a0-0000-0000-000000000001';
const WS1 = '99999999-a0a0-0000-0000-000000000002';
const T2 = '99999999-a0a0-0000-0000-000000000003';
const WS2 = '99999999-a0a0-0000-0000-000000000004';
const BIZ_CODE_T1 = 'export-test-biz-t1';
const BIZ_CODE_T2 = 'export-test-biz-t2';

describe.runIf(run)('export-tenant.sh — live PostgreSQL', () => {
  let adminPool: Pool;
  let outputDir: string;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL });
    await adminPool.query(
      `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code) VALUES
         ($1,'Export Test Tenant 1','export-t1','active','test'),
         ($2,'Export Test Tenant 2','export-t2','active','test')
       ON CONFLICT (id) DO NOTHING`,
      [T1, T2]
    );
    await adminPool.query(
      `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status) VALUES
         ($1,$2,'Export Test WS 1','export-ws1','active'),
         ($3,$4,'Export Test WS 2','export-ws2','active')
       ON CONFLICT (id) DO NOTHING`,
      [WS1, T1, WS2, T2]
    );
    await adminPool.query(
      `INSERT INTO platform.businesses (id, tenant_id, workspace_id, legal_name, business_code, status) VALUES
         (gen_random_uuid(),$1,$2,'Export Test Biz 1',$3,'active')
       ON CONFLICT (tenant_id, business_code) DO NOTHING`,
      [T1, WS1, BIZ_CODE_T1]
    );
    await adminPool.query(
      `INSERT INTO platform.businesses (id, tenant_id, workspace_id, legal_name, business_code, status) VALUES
         (gen_random_uuid(),$1,$2,'Export Test Biz 2',$3,'active')
       ON CONFLICT (tenant_id, business_code) DO NOTHING`,
      [T2, WS2, BIZ_CODE_T2]
    );
    outputDir = await mkdtemp(join(tmpdir(), 'infinicus-export-test-'));
  }, 30_000);

  afterAll(async () => {
    if (adminPool) await adminPool.end();
    if (outputDir) await rm(outputDir, { recursive: true, force: true });
  });

  it('exports only the target tenant\'s data, never another tenant\'s', async () => {
    const outputFile = join(outputDir, 'export.sql');
    await execFileAsync('bash', [EXPORT_SH], {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL, TENANT_ID: T1, OUTPUT_FILE: outputFile },
    });

    const contents = await readFile(outputFile, 'utf8');
    expect(contents).toContain(BIZ_CODE_T1);
    expect(contents).not.toContain(BIZ_CODE_T2);
    expect(contents).toContain(T1);
    expect(contents).not.toContain(T2);
  }, 30_000);

  it('refuses to run against a superuser/BYPASSRLS connection', async () => {
    const adminUrl = process.env.ADMIN_DATABASE_URL;
    if (!adminUrl) return; // no separate admin credential configured in this environment

    const outputFile = join(outputDir, 'should-not-exist.sql');
    let caught: { stderr?: string } | undefined;
    try {
      await execFileAsync('bash', [EXPORT_SH], {
        env: { ...process.env, DATABASE_URL: adminUrl, TENANT_ID: T1, OUTPUT_FILE: outputFile },
      });
    } catch (err) {
      caught = err as { stderr?: string };
    }
    expect(caught, 'export-tenant.sh should have refused a BYPASSRLS connection').toBeDefined();
    expect(caught?.stderr).toMatch(/bypasses row-level security/);
  }, 30_000);
});

describe.skipIf(run)('export-tenant.sh — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
