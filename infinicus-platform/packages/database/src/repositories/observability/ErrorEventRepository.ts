import { withTransaction } from '../../client.js';

/**
 * BUILD-19 discovered that a Postgres session variable set via SET LOCAL
 * on a pooled connection reverts to an empty string, not NULL, once that
 * transaction commits — so a later transaction reusing the same physical
 * connection sees current_setting('app.tenant_id', true) = '' rather
 * than NULL, and ''::uuid throws "invalid input syntax for type uuid".
 * Any query relying on error_events_isolation's tenant_id = current_setting(...)::uuid
 * branch (i.e. scanning rows with a non-null tenant_id) must defensively
 * set a valid, castable sentinel first — the same nil-UUID pattern
 * OnboardingProgressRepository.getActiveForUser() already established.
 */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export type ErrorEventLevel = 'warning' | 'error';

export interface ErrorEvent {
  id: string;
  tenantId: string | null;
  correlationId: string | null;
  level: ErrorEventLevel;
  errorName: string;
  message: string;
  route: string | null;
  statusCode: number | null;
  context: Record<string, unknown>;
  occurredAt: Date;
}

export interface RecordErrorInput {
  tenantId?: string | null;
  correlationId?: string | null;
  level?: ErrorEventLevel;
  errorName: string;
  /** Caller's responsibility to have already redacted any secret value (see @infinicus/configuration's redactSecretValues) before this reaches persistence. */
  message: string;
  route?: string | null;
  statusCode?: number | null;
  context?: Record<string, unknown>;
}

function rowToErrorEvent(row: Record<string, unknown>): ErrorEvent {
  return {
    id: row.id as string,
    tenantId: (row.tenant_id as string | null) ?? null,
    correlationId: (row.correlation_id as string | null) ?? null,
    level: row.level as ErrorEventLevel,
    errorName: row.error_name as string,
    message: row.message as string,
    route: (row.route as string | null) ?? null,
    statusCode: (row.status_code as number | null) ?? null,
    context: row.context as Record<string, unknown>,
    occurredAt: row.occurred_at as Date,
  };
}

/**
 * observability.error_events has nullable tenant_id (an error may occur
 * before a tenant is known) — same pattern as AccessEventRepository: a
 * non-null tenantId must be set in-session before the insert or RLS
 * rejects the write.
 */
export class ErrorEventRepository {
  async record(input: RecordErrorInput): Promise<ErrorEvent> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', input.tenantId ?? NIL_UUID]);
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO observability.error_events (tenant_id, correlation_id, level, error_name, message, route, status_code, context)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          input.tenantId ?? null,
          input.correlationId ?? null,
          input.level ?? 'error',
          input.errorName,
          input.message,
          input.route ?? null,
          input.statusCode ?? null,
          JSON.stringify(input.context ?? {}),
        ]
      );
      return rowToErrorEvent(result.rows[0]);
    });
  }

  /**
   * Errors in the last `sinceMinutes` minutes. Deliberately resets
   * app.tenant_id to the nil-UUID sentinel first (see NIL_UUID above) so
   * this always deterministically counts only tenant-NULL (pre-auth/
   * global) errors under the application's own RLS-restricted role,
   * never accidentally inheriting another request's leftover tenant
   * context from a reused pooled connection. This is NOT a true
   * cross-tenant platform-wide count — for that, call with an
   * ADMIN_DATABASE_URL connection (bypasses RLS entirely), the same
   * pattern backup.sh already establishes for reading cross-tenant
   * bookkeeping data.
   */
  async countSince(sinceMinutes: number): Promise<number> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', NIL_UUID]);
      const result = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM observability.error_events
         WHERE occurred_at > now() - ($1 || ' minutes')::interval`,
        [sinceMinutes]
      );
      return Number(result.rows[0].count);
    });
  }

  /** Deliberately resets app.tenant_id to the nil-UUID sentinel first — see countSince()'s doc comment above for why. */
  async listRecent(limit = 50): Promise<ErrorEvent[]> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', NIL_UUID]);
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM observability.error_events ORDER BY occurred_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(rowToErrorEvent);
    });
  }
}
