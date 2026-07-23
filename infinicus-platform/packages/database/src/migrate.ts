/**
 * Migration runner.
 * Applies any *.sql files in the migrations directory that are not yet in _migrations.
 * Usage: npx tsx packages/database/src/migrate.ts
 */
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import { getPool } from './client.js';

const MIGRATIONS_DIR = resolve(
  __dirname,
  '../../../infrastructure/database/migrations'
);

/**
 * Fixed session-level advisory-lock key for this migration runner only (not
 * shared with any other pg_advisory_lock usage in this codebase). Serializes
 * concurrent runMigrations() invocations — e.g. two application instances
 * starting simultaneously against the same database — so they apply
 * migrations one at a time instead of racing on the _migrations table and
 * on the DDL itself (a lost race can otherwise produce a duplicate-object
 * error or, worse, a torn partial apply). A blocked caller waits for the
 * lock rather than failing; the lock is released even if migration fails.
 */
const MIGRATION_LOCK_KEY = 727_310_001;

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  // Advisory locks are session-scoped, so the lock, every migration
  // statement, and the unlock must all run on the same dedicated
  // connection — pool.query() alone could hand out a different backend
  // per call and defeat the lock entirely.
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);

    // Ensure migration registry exists (idempotent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL      PRIMARY KEY,
        filename   TEXT        NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query<{ filename: string }>(
      'SELECT filename FROM _migrations ORDER BY id'
    );
    const appliedSet = new Set(applied.map(r => r.filename));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }
      const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  apply ${file}`);
      await client.query(sql);
      console.log(`  done  ${file}`);
    }

    console.log('Migrations complete.');
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    client.release();
  }
}
