/**
 * Live PostgreSQL 16 test for BUILD-22's backup/restore-testing
 * requirement. Actually invokes infrastructure/database/scripts/backup.sh
 * and restore.sh (the same scripts an operator or a scheduled job would
 * run), not a reimplementation of their logic — this is acceptance
 * evidence that the real, shippable scripts work end to end, not just
 * that pg_dump/pg_restore work in the abstract.
 *
 * Runs against its own dedicated, isolated scratch database — not the
 * shared infinicus_test database every other test file in this suite
 * runs concurrently against. An earlier version of this test compared
 * row counts against a "live" query of infinicus_test taken well after
 * backup.sh's snapshot, which other concurrently-running test files (e.g.
 * api-idempotency.integration.test.ts) had since mutated — a real bug in
 * this test's isolation, not in backup.sh/restore.sh themselves. A
 * dedicated scratch database, seeded once and never touched by anything
 * else, removes the race entirely instead of narrowing its window.
 *
 * Requires:
 *   ADMIN_DATABASE_URL — a role with CREATEDB and read access to every
 *     schema (the backup script requires this — see backup.sh's own
 *     header comment).
 *
 * Guard pattern: describe.runIf(!!process.env.ADMIN_DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Pool } from 'pg';

const execFileAsync = promisify(execFile);

const run = !!process.env.ADMIN_DATABASE_URL;

const SCRIPTS_DIR = resolve(__dirname, '../../../infrastructure/database/scripts');
const BACKUP_SH = join(SCRIPTS_DIR, 'backup.sh');
const RESTORE_SH = join(SCRIPTS_DIR, 'restore.sh');
const DIST_INDEX = resolve(__dirname, '../dist/index.js');

// Runs migrations against `databaseUrl` in a separate OS process, not this
// test file's own process — @infinicus/database's connection pool is a
// process-wide module singleton, and this file must not disturb whatever
// pool any other concurrently-running test file is using.
function runMigrationsInChildProcess(databaseUrl: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['-e', `
      const { createPool, runMigrations, closePool } = require(${JSON.stringify(DIST_INDEX)});
      createPool({ connectionString: process.env.DATABASE_URL });
      runMigrations().then(() => closePool()).then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
    `], { env: { ...process.env, DATABASE_URL: databaseUrl } });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolvePromise() : reject(new Error(`migration child process exited ${code}: ${stderr}`))));
  });
}

const SOURCE_DB = `infinicus_backup_source_test_${Date.now()}`;
const RESTORE_DB = `infinicus_backup_restore_test_${Date.now()}`;

const SAMPLE_TABLES = ['tenancy.tenants', 'identity.users', '_migrations'];

function urlFor(adminUrl: URL, database: string): string {
  return `postgresql://${adminUrl.username}:${adminUrl.password}@${adminUrl.hostname}:${adminUrl.port || 5432}/${database}`;
}

describe.runIf(run)('Backup and restore scripts — live PostgreSQL', () => {
  const adminUrl = new URL(process.env.ADMIN_DATABASE_URL ?? 'postgresql://x');
  const maintenanceUrl = urlFor(adminUrl, 'postgres');
  const sourceUrl = urlFor(adminUrl, SOURCE_DB);
  const restoreUrl = urlFor(adminUrl, RESTORE_DB);

  let backupDir: string;
  let backupFile: string;
  let maintenancePool: Pool;
  let expectedCounts: Record<string, string>;

  beforeAll(async () => {
    maintenancePool = new Pool({ connectionString: maintenanceUrl });
    await maintenancePool.query(`CREATE DATABASE ${SOURCE_DB}`);

    await runMigrationsInChildProcess(sourceUrl);

    const sourcePool = new Pool({ connectionString: sourceUrl });
    try {
      await sourcePool.query(
        `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code) VALUES
           (gen_random_uuid(), 'Backup Test Tenant', 'backup-restore-test-t1', 'active', 'test')`
      );
      expectedCounts = {};
      for (const table of SAMPLE_TABLES) {
        const { rows } = await sourcePool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table}`);
        expectedCounts[table] = rows[0].count;
      }
    } finally {
      await sourcePool.end();
    }
  }, 60_000);

  afterAll(async () => {
    if (maintenancePool) {
      await maintenancePool.query(`DROP DATABASE IF EXISTS ${SOURCE_DB}`);
      await maintenancePool.query(`DROP DATABASE IF EXISTS ${RESTORE_DB}`);
      await maintenancePool.end();
    }
    if (backupDir) await rm(backupDir, { recursive: true, force: true });
  }, 30_000);

  it('backup.sh produces a valid, restorable pg_dump archive', async () => {
    backupDir = await mkdtemp(join(tmpdir(), 'infinicus-backup-test-'));

    const { stdout } = await execFileAsync('bash', [BACKUP_SH], {
      env: { ...process.env, DATABASE_URL: sourceUrl, BACKUP_DIR: backupDir },
    });

    const files = await readdir(backupDir);
    expect(files).toHaveLength(1);
    backupFile = join(backupDir, files[0]);
    expect(stdout).toContain('Backup complete');

    const { stdout: listOutput } = await execFileAsync('pg_restore', ['--list', backupFile]);
    expect(listOutput).toMatch(/TOC Entries: \d+/);
    const tocEntries = Number(listOutput.match(/TOC Entries: (\d+)/)?.[1] ?? 0);
    expect(tocEntries).toBeGreaterThan(1000);
  }, 60_000);

  it('restore.sh restores the backup into a fresh database with matching row counts', async () => {
    expect(backupFile, 'backup.sh test must run first').toBeDefined();

    await execFileAsync('bash', [RESTORE_SH, backupFile], {
      env: { ...process.env, MAINTENANCE_DATABASE_URL: maintenanceUrl, TARGET_DATABASE_URL: restoreUrl },
    });

    const restoredPool = new Pool({ connectionString: restoreUrl });
    try {
      for (const table of SAMPLE_TABLES) {
        const { rows } = await restoredPool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table}`);
        expect(rows[0].count, `row count mismatch for ${table}`).toBe(expectedCounts[table]);
      }
    } finally {
      await restoredPool.end();
    }
  }, 60_000);

  it('restore.sh refuses to restore over an already-existing database', async () => {
    expect(backupFile, 'backup.sh test must run first').toBeDefined();
    // RESTORE_DB now exists (created by the previous test) — a second
    // restore attempt against it must fail loudly, not silently overwrite.
    let caught: { stderr?: string; code?: number } | undefined;
    try {
      await execFileAsync('bash', [RESTORE_SH, backupFile], {
        env: { ...process.env, MAINTENANCE_DATABASE_URL: maintenanceUrl, TARGET_DATABASE_URL: restoreUrl },
      });
    } catch (err) {
      caught = err as { stderr?: string; code?: number };
    }
    expect(caught, 'restore.sh should have exited non-zero').toBeDefined();
    expect(caught?.stderr).toMatch(/already exists/);
  }, 30_000);
});

describe.skipIf(run)('Backup and restore scripts — live PostgreSQL (skipped, no ADMIN_DATABASE_URL)', () => {
  it('skips live tests when ADMIN_DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
