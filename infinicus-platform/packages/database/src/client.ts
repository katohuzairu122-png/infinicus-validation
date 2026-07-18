import { Pool, type PoolConfig, type QueryResult } from 'pg';

let pool: Pool | null = null;

export interface DbConfig {
  connectionString: string;
  poolMin?: number;
  poolMax?: number;
  ssl?: boolean;
}

export function createPool(config: DbConfig): Pool {
  const opts: PoolConfig = {
    connectionString: config.connectionString,
    min:  config.poolMin ?? 2,
    max:  config.poolMax ?? 10,
    ssl:  config.ssl ? { rejectUnauthorized: false } : false,
  };
  pool = new Pool(opts);
  pool.on('error', (err) => {
    console.error('[db] idle client error', err);
  });
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('Database pool not initialised — call createPool() first.');
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(sql, params);
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}
