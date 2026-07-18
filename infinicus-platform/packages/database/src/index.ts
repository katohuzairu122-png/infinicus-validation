// @infinicus/database — public API
export { createPool, getPool, query, closePool } from './client.js';
export type { DbConfig } from './client.js';
export { runMigrations } from './migrate.js';
