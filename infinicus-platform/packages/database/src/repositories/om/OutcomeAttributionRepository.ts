import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { OutcomeAttributionNotFoundError } from './errors.js';

export interface OutcomeAttributionRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  observationId: string;
  status: string;
}

const VALID_STATUSES = ['queued', 'running', 'completed', 'failed'];

function rowToRun(row: Record<string, unknown>): OutcomeAttributionRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    observationId: row.observation_id as string,
    status: row.status as string,
  };
}

export class OutcomeAttributionRepository {
  async requestRun(ctx: TenantContext, businessId: string, observationId: string): Promise<OutcomeAttributionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_attribution_runs (tenant_id, workspace_id, business_id, observation_id)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, observationId]
      );
      return rowToRun(result.rows[0]);
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string): Promise<OutcomeAttributionRun> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new OutcomeAttributionNotFoundError('OutcomeAttributionRun', id);
    }
    return withTenantTransaction(ctx, async (client) => {
      const extra = toStatus === 'completed' || toStatus === 'failed' ? ', completed_at = now()' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.outcome_attribution_runs SET status = $2${extra} WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new OutcomeAttributionNotFoundError('OutcomeAttributionRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async markRunning(ctx: TenantContext, id: string): Promise<OutcomeAttributionRun> {
    return this.transition(ctx, id, 'running');
  }

  async complete(ctx: TenantContext, id: string): Promise<OutcomeAttributionRun> {
    return this.transition(ctx, id, 'completed');
  }

  async fail(ctx: TenantContext, id: string): Promise<OutcomeAttributionRun> {
    return this.transition(ctx, id, 'failed');
  }

  async addFactor(ctx: TenantContext, attributionRunId: string, businessId: string, factorCode: string, description: string): Promise<string> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_attribution_factors (attribution_run_id, tenant_id, workspace_id, business_id, factor_code, description)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [attributionRunId, ctx.tenantId, ctx.workspaceId, businessId, factorCode, description]
      );
      return result.rows[0].id as string;
    });
  }

  async addResult(ctx: TenantContext, attributionRunId: string, businessId: string, factorId: string, attributedWeight: number, uncertainty: number): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.outcome_attribution_results (attribution_run_id, tenant_id, workspace_id, business_id, factor_id, attributed_weight, uncertainty)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [attributionRunId, ctx.tenantId, ctx.workspaceId, businessId, factorId, attributedWeight, uncertainty]
      );
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<OutcomeAttributionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.outcome_attribution_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new OutcomeAttributionNotFoundError('OutcomeAttributionRun', id);
      return rowToRun(result.rows[0]);
    });
  }
}
