import { Pool, type PoolClient, type PoolConfig, type QueryResult } from 'pg';

let pool: Pool | null = null;

export interface DbConfig {
  connectionString: string;
  poolMin?: number;
  poolMax?: number;
  ssl?: boolean;
}

export interface TenantContext {
  tenantId:    string;
  workspaceId: string;
  userId:      string;
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

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(sql, params);
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}

export async function getDatabasePool(): Promise<Pool> {
  return getPool();
}

export async function closeDatabasePool(): Promise<void> {
  return closePool();
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function withTenantTransaction<T>(
  ctx: TenantContext,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withTransaction(async (client) => {
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id',    ctx.tenantId]);
    await client.query('SELECT set_config($1, $2, true)', ['app.workspace_id', ctx.workspaceId]);
    await client.query('SELECT set_config($1, $2, true)', ['app.user_id',      ctx.userId]);
    return fn(client);
  });
}
