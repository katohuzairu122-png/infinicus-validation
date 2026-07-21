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

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  // Ensure migration registry exists (idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL      PRIMARY KEY,
      filename   TEXT        NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows: applied } = await pool.query<{ filename: string }>(
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
    await pool.query(sql);
    console.log(`  done  ${file}`);
  }

  console.log('Migrations complete.');
}
