import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { OutcomeVarianceNotFoundError, OutcomeVarianceStateConflictError } from './errors.js';

export interface OutcomeVarianceRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  targetId: string;
  status: string;
}

const VALID_STATUSES = ['queued', 'running', 'completed', 'failed'];

function rowToRun(row: Record<string, unknown>): OutcomeVarianceRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    targetId: row.target_id as string,
    status: row.status as string,
  };
}

export class OutcomeVarianceRepository {
  async requestRun(ctx: TenantContext, businessId: string, targetId: string): Promise<OutcomeVarianceRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_variance_runs (tenant_id, workspace_id, business_id, target_id)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, targetId]
      );
      return rowToRun(result.rows[0]);
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string): Promise<OutcomeVarianceRun> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new OutcomeVarianceStateConflictError('OutcomeVarianceRun', `unknown status: ${toStatus}`);
    }
    return withTenantTransaction(ctx, async (client) => {
      const extra = toStatus === 'completed' || toStatus === 'failed' ? ', completed_at = now()' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.outcome_variance_runs SET status = $2${extra} WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new OutcomeVarianceNotFoundError('OutcomeVarianceRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async markRunning(ctx: TenantContext, id: string): Promise<OutcomeVarianceRun> {
    return this.transition(ctx, id, 'running');
  }

  async complete(ctx: TenantContext, id: string): Promise<OutcomeVarianceRun> {
    return this.transition(ctx, id, 'completed');
  }

  async fail(ctx: TenantContext, id: string): Promise<OutcomeVarianceRun> {
    return this.transition(ctx, id, 'failed');
  }

  async addResult(ctx: TenantContext, varianceRunId: string, businessId: string, metricCode: string, varianceValue: Record<string, unknown>): Promise<string> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_variance_results (variance_run_id, tenant_id, workspace_id, business_id, metric_code, variance_value)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [varianceRunId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, JSON.stringify(varianceValue)]
      );
      return result.rows[0].id as string;
    });
  }

  async addComparison(ctx: TenantContext, varianceRunId: string, businessId: string, metricCode: string, expectedValue: Record<string, unknown>, actualValue: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.expected_actual_comparisons (variance_run_id, tenant_id, workspace_id, business_id, metric_code, expected_value, actual_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [varianceRunId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, JSON.stringify(expectedValue), JSON.stringify(actualValue)]
      );
    });
  }

  async addExplanation(ctx: TenantContext, varianceResultId: string, businessId: string, explanationCode: string, statement: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.variance_explanations (variance_result_id, tenant_id, workspace_id, business_id, explanation_code, statement)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [varianceResultId, ctx.tenantId, ctx.workspaceId, businessId, explanationCode, statement]
      );
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<OutcomeVarianceRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.outcome_variance_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new OutcomeVarianceNotFoundError('OutcomeVarianceRun', id);
      return rowToRun(result.rows[0]);
    });
  }
}
