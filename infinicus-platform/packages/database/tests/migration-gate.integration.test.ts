/**
 * Live PostgreSQL 16 test for BUILD-23's migration-gate requirement
 * (infrastructure/deployment/scripts/migration-gate.sh). Runs the real
 * script against a dedicated scratch database, not a reimplementation.
 *
 * Requires:
 *   ADMIN_DATABASE_URL — a role with CREATEDB.
 *
 * Guard pattern: describe.runIf(!!process.env.ADMIN_DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const execFileAsync = promisify(execFile);
const run = !!process.env.ADMIN_DATABASE_URL;

const MIGRATION_GATE_SH = resolve(__dirname, '../../../infrastructure/deployment/scripts/migration-gate.sh');
const SCRATCH_DB = `infinicus_migration_gate_test_${Date.now()}`;

describe.runIf(run)('migration-gate.sh — live PostgreSQL', () => {
  let maintenancePool: Pool;
  let scratchUrl: string;

  beforeAll(async () => {
    const adminUrl = new URL(process.env.ADMIN_DATABASE_URL!);
    maintenancePool = new Pool({
      host: adminUrl.hostname,
      port: Number(adminUrl.port || 5432),
      user: decodeURIComponent(adminUrl.username),
      password: decodeURIComponent(adminUrl.password),
      database: 'postgres',
    });
    await maintenancePool.query(`CREATE DATABASE ${SCRATCH_DB}`);
    scratchUrl = `postgresql://${adminUrl.username}:${adminUrl.password}@${adminUrl.hostname}:${adminUrl.port || 5432}/${SCRATCH_DB}`;
  }, 30_000);

  afterAll(async () => {
    if (maintenancePool) {
      await maintenancePool.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB}`);
      await maintenancePool.end();
    }
  }, 30_000);

  it('applies every migration to a fresh database and exits 0', async () => {
    const { stdout } = await execFileAsync('bash', [MIGRATION_GATE_SH], {
      env: { ...process.env, DATABASE_URL: scratchUrl },
    });
    expect(stdout).toContain('Migration gate passed.');

    const verifyPool = new Pool({ connectionString: scratchUrl });
    try {
      const { rows } = await verifyPool.query<{ exists: boolean }>(
        "SELECT to_regclass('platform.deployment_events') IS NOT NULL AS exists"
      );
      expect(rows[0].exists).toBe(true);
    } finally {
      await verifyPool.end();
    }
  }, 60_000);

  it('is idempotent — a second run against the same database also exits 0 with nothing new to apply', async () => {
    const { stdout } = await execFileAsync('bash', [MIGRATION_GATE_SH], {
      env: { ...process.env, DATABASE_URL: scratchUrl },
    });
    expect(stdout).toContain('Migration gate passed.');
    expect(stdout).not.toContain('apply 0001');
  }, 30_000);

  it('fails with a non-zero exit when DATABASE_URL is missing', async () => {
    let caught: { code?: number; stderr?: string } | undefined;
    try {
      await execFileAsync('bash', [MIGRATION_GATE_SH], { env: { ...process.env, DATABASE_URL: '' } });
    } catch (err) {
      caught = err as { code?: number; stderr?: string };
    }
    expect(caught).toBeDefined();
    expect(caught?.stderr).toMatch(/DATABASE_URL is required/);
  }, 10_000);
});

describe.skipIf(run)('migration-gate.sh — live PostgreSQL (skipped, no ADMIN_DATABASE_URL)', () => {
  it('skips live tests when ADMIN_DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
