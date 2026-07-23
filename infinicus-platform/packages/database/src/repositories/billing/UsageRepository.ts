import { withTenantTransaction, type TenantContext } from '../../client.js';
import { UsageLimitExceededError } from './errors.js';

export type UsageMetric = 'simulation_runs' | 'reasoning_runs';

export interface UsageRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  metric: UsageMetric;
  periodStart: Date;
  periodEnd: Date;
  quantity: number;
}

/** Calendar-month billing period, UTC. */
function currentMonthPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export class UsageRepository {
  async getCurrent(ctx: TenantContext, metric: UsageMetric): Promise<number> {
    const { start } = currentMonthPeriod();
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<{ quantity: string }>(
        'SELECT quantity FROM billing.usage_records WHERE tenant_id = $1 AND metric = $2 AND period_start = $3',
        [ctx.tenantId, metric, start]
      );
      return result.rows.length === 0 ? 0 : Number(result.rows[0].quantity);
    });
  }

  /**
   * Atomically increments usage for the current billing period and
   * enforces limitValue (null = unlimited, e.g. the enterprise plan).
   *
   * The INSERT ... ON CONFLICT DO UPDATE acquires a row-level lock on the
   * tenant/metric/period row, so concurrent callers serialize on it —
   * this is what makes the check-after-increment race-free: a second
   * concurrent call blocks until the first commits or rolls back, then
   * sees the already-updated quantity, not a stale pre-increment value.
   *
   * If the increment would exceed the limit, a compensating decrement
   * runs in the SAME transaction before throwing — the row never
   * reflects a rejected attempt (fail-closed: the caller's action did
   * not happen, so its usage should not be recorded either) — and
   * billing.emit_usage_limit_exceeded() still leaves an event trail of
   * the attempt.
   */
  async incrementAndCheck(
    ctx: TenantContext, metric: UsageMetric, quantity: number, limitValue: number | null
  ): Promise<number> {
    const { start, end } = currentMonthPeriod();
    return withTenantTransaction(ctx, async (client) => {
      const upsert = await client.query<{ quantity: string; correlation_id: string }>(
        `INSERT INTO billing.usage_records (tenant_id, workspace_id, metric, period_start, period_end, quantity)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, metric, period_start)
         DO UPDATE SET quantity = billing.usage_records.quantity + excluded.quantity
         RETURNING quantity, correlation_id`,
        [ctx.tenantId, ctx.workspaceId, metric, start, end, quantity]
      );
      const newQuantity = Number(upsert.rows[0].quantity);

      if (limitValue !== null && newQuantity > limitValue) {
        await client.query(
          `UPDATE billing.usage_records SET quantity = quantity - $4
           WHERE tenant_id = $1 AND metric = $2 AND period_start = $3`,
          [ctx.tenantId, metric, start, quantity]
        );
        await client.query('SELECT billing.emit_usage_limit_exceeded($1,$2,$3,$4,$5,$6)', [
          ctx.tenantId, ctx.workspaceId, metric, limitValue, newQuantity, upsert.rows[0].correlation_id,
        ]);
        throw new UsageLimitExceededError(metric, limitValue, newQuantity);
      }

      return newQuantity;
    });
  }
}
