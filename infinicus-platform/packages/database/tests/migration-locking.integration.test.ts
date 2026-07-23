/**
 * Live PostgreSQL 16 test for BUILD-22's migration advisory-locking
 * requirement. Simulates two independent application instances starting
 * simultaneously against the same, previously-empty database — the
 * scenario the advisory lock in packages/database/src/migrate.ts exists to
 * protect against (racing on the _migrations table / racing DDL, which can
 * otherwise produce a duplicate-object error or a torn partial apply).
 *
 * Each "instance" is a genuinely separate OS process (its own Node.js
 * process, its own connection pool, its own module-level state) — not two
 * calls sharing this test process's own @infinicus/database singleton
 * pool, which would not exercise real inter-process contention for the
 * same advisory lock key.
 *
 * Requires:
 *   ADMIN_DATABASE_URL — a superuser/admin connection, used only to
 *     CREATE DATABASE / DROP DATABASE the scratch database this test owns.
 *
 * Guard pattern: describe.runIf(!!process.env.ADMIN_DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const run = !!process.env.ADMIN_DATABASE_URL;

const SCRATCH_DB = `infinicus_migration_lock_test_${Date.now()}`;
const DIST_INDEX = resolve(__dirname, '../dist/index.js');
const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function runInChildProcess(databaseUrl: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['-e', `
      const { createPool, runMigrations, closePool } = require(${JSON.stringify(DIST_INDEX)});
      createPool({ connectionString: process.env.DATABASE_URL });
      runMigrations()
        .then(() => closePool())
        .then(() => process.exit(0))
        .catch((err) => { console.error(err); process.exit(1); });
    `], { env: { ...process.env, DATABASE_URL: databaseUrl } });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
  });
}

describe.runIf(run)('Migration advisory locking — live PostgreSQL', () => {
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

  it('two concurrent runMigrations() invocations against a fresh database both succeed with no duplicate or partial application', async () => {
    const [resultA, resultB] = await Promise.all([
      runInChildProcess(scratchUrl),
      runInChildProcess(scratchUrl),
    ]);

    expect(resultA.code, `instance A stderr: ${resultA.stderr}`).toBe(0);
    expect(resultB.code, `instance B stderr: ${resultB.stderr}`).toBe(0);

    const verifyPool = new Pool({ connectionString: scratchUrl });
    try {
      const fileCount = (await readdir(MIGRATIONS_DIR)).filter(f => f.endsWith('.sql')).length;

      const { rows: countRows } = await verifyPool.query<{ count: string }>('SELECT count(*)::text AS count FROM _migrations');
      expect(Number(countRows[0].count)).toBe(fileCount);

      const { rows: distinctRows } = await verifyPool.query<{ count: string }>('SELECT count(DISTINCT filename)::text AS count FROM _migrations');
      expect(Number(distinctRows[0].count)).toBe(fileCount);

      // Spot-check the very last migration's own table actually exists —
      // proof migrations ran to completion, not a partial/interrupted apply.
      const { rows: tableRows } = await verifyPool.query<{ exists: boolean }>(
        "SELECT to_regclass('api.idempotency_keys') IS NOT NULL AS exists"
      );
      expect(tableRows[0].exists).toBe(true);
    } finally {
      await verifyPool.end();
    }
  }, 60_000);

  it('a held advisory lock blocks a second concurrent acquisition attempt on the same key', async () => {
    const holderPool = new Pool({ connectionString: scratchUrl });
    const contenderPool = new Pool({ connectionString: scratchUrl });
    try {
      const holder = await holderPool.connect();
      const contender = await contenderPool.connect();
      try {
        await holder.query('SELECT pg_advisory_lock(727310001)');

        let contenderAcquired = false;
        const contenderPromise = contender.query('SELECT pg_advisory_lock(727310001)').then(() => {
          contenderAcquired = true;
        });

        // Give the contender a real chance to (incorrectly) acquire immediately.
        await new Promise((r) => setTimeout(r, 200));
        expect(contenderAcquired).toBe(false);

        await holder.query('SELECT pg_advisory_unlock(727310001)');
        await contenderPromise;
        expect(contenderAcquired).toBe(true);

        await contender.query('SELECT pg_advisory_unlock(727310001)');
      } finally {
        holder.release();
        contender.release();
      }
    } finally {
      await holderPool.end();
      await contenderPool.end();
    }
  }, 15_000);
});

describe.skipIf(run)('Migration advisory locking — live PostgreSQL (skipped, no ADMIN_DATABASE_URL)', () => {
  it('skips live tests when ADMIN_DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
