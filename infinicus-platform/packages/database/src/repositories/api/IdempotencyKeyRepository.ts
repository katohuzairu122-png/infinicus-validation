import { withTenantTransaction, type TenantContext } from '../../client.js';
import { IdempotencyConflictError } from './errors.js';

export interface IdempotencyRecord {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  route: string;
  requestHash: string;
  status: 'in_progress' | 'completed';
  responseStatus: number | null;
  responseBody: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export type BeginResult =
  | { claimed: true }
  | { claimed: false; existing: IdempotencyRecord };

function rowToRecord(row: Record<string, unknown>): IdempotencyRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    idempotencyKey: row.idempotency_key as string,
    route: row.route as string,
    requestHash: row.request_hash as string,
    status: row.status as 'in_progress' | 'completed',
    responseStatus: row.response_status as number | null,
    responseBody: row.response_body,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
}

/**
 * Generic HTTP-layer idempotency: a caller-supplied Idempotency-Key header
 * (scoped per tenant + route) claims exclusive ownership of processing a
 * request. A second request with the same key and the same request body
 * (requestHash) is told to replay the first request's stored response
 * instead of processing again; the same key with a *different* body is
 * rejected as a conflict.
 */
export class IdempotencyKeyRepository {
  async begin(ctx: TenantContext, idempotencyKey: string, route: string, requestHash: string): Promise<BeginResult> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT * FROM api.idempotency_keys WHERE tenant_id = $1 AND idempotency_key = $2 AND route = $3',
        [ctx.tenantId, idempotencyKey, route]
      );
      if (existing.rows.length > 0) {
        const record = rowToRecord(existing.rows[0]);
        if (record.requestHash !== requestHash) throw new IdempotencyConflictError(idempotencyKey);
        return { claimed: false, existing: record };
      }
      try {
        await client.query(
          `INSERT INTO api.idempotency_keys (tenant_id, idempotency_key, route, request_hash) VALUES ($1,$2,$3,$4)`,
          [ctx.tenantId, idempotencyKey, route, requestHash]
        );
        return { claimed: true };
      } catch (err) {
        if (isUniqueViolation(err)) {
          // Lost a race with a concurrent request carrying the same key — treat as a replay lookup.
          const raced = await client.query<Record<string, unknown>>(
            'SELECT * FROM api.idempotency_keys WHERE tenant_id = $1 AND idempotency_key = $2 AND route = $3',
            [ctx.tenantId, idempotencyKey, route]
          );
          const record = rowToRecord(raced.rows[0]);
          if (record.requestHash !== requestHash) throw new IdempotencyConflictError(idempotencyKey);
          return { claimed: false, existing: record };
        }
        throw err;
      }
    });
  }

  async complete(ctx: TenantContext, idempotencyKey: string, route: string, responseStatus: number, responseBody: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `UPDATE api.idempotency_keys SET status = 'completed', response_status = $4, response_body = $5
         WHERE tenant_id = $1 AND idempotency_key = $2 AND route = $3`,
        [ctx.tenantId, idempotencyKey, route, responseStatus, JSON.stringify(responseBody)]
      );
    });
  }
}
