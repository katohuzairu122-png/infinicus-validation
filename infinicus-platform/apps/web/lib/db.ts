import { createPool, getPool } from '@infinicus/database';

/**
 * Checks the actual module-scope pool state (via getPool()) rather than a
 * cached boolean: Next.js dev mode compiles each route as a separate
 * on-demand bundle, so @infinicus/database can end up as multiple distinct
 * module instances, each with its own module-scope `pool` variable — a
 * globalThis-cached "already initialized" flag would be true for the
 * process while a given route's own copy of the module was never
 * actually initialized. Checking getPool() per-instance is self-healing
 * regardless of how many module copies exist, and in a production build
 * (one server bundle, one module instance) this still only calls
 * createPool() once.
 */
export function ensurePool(): void {
  try {
    getPool();
    return;
  } catch {
    // not yet initialized in this module instance — fall through
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — required to run the INFINICUS web app.');
  }
  createPool({ connectionString });
}
