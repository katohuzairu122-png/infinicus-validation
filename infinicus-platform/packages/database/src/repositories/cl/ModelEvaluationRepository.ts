import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ModelEvaluationNotFoundError } from './errors.js';

export interface ModelEvaluationRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  learningCaseId: string | null;
  modelCode: string;
  status: string;
}

const VALID_STATUSES = ['queued', 'running', 'completed', 'failed'];

function rowToRun(row: Record<string, unknown>): ModelEvaluationRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    learningCaseId: row.learning_case_id as string | null,
    modelCode: row.model_code as string,
    status: row.status as string,
  };
}

export class ModelEvaluationRepository {
  async requestRun(ctx: TenantContext, businessId: string, modelCode: string, learningCaseId: string | null = null): Promise<ModelEvaluationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.model_evaluation_runs (tenant_id, workspace_id, business_id, learning_case_id, model_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, learningCaseId, modelCode]
      );
      return rowToRun(result.rows[0]);
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string): Promise<ModelEvaluationRun> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ModelEvaluationNotFoundError('ModelEvaluationRun', id);
    }
    return withTenantTransaction(ctx, async (client) => {
      const extra = toStatus === 'completed' || toStatus === 'failed' ? ', completed_at = now()' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.model_evaluation_runs SET status = $2${extra} WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new ModelEvaluationNotFoundError('ModelEvaluationRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async markRunning(ctx: TenantContext, id: string): Promise<ModelEvaluationRun> {
    return this.transition(ctx, id, 'running');
  }

  async complete(ctx: TenantContext, id: string): Promise<ModelEvaluationRun> {
    return this.transition(ctx, id, 'completed');
  }

  async fail(ctx: TenantContext, id: string): Promise<ModelEvaluationRun> {
    return this.transition(ctx, id, 'failed');
  }

  async addResult(ctx: TenantContext, evaluationRunId: string, businessId: string, metricCode: string, metricValue: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.model_evaluation_results (evaluation_run_id, tenant_id, workspace_id, business_id, metric_code, metric_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [evaluationRunId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, JSON.stringify(metricValue)]
      );
    });
  }

  async recordDrift(ctx: TenantContext, evaluationRunId: string, businessId: string, driftType: string, magnitude: number): Promise<string> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.model_drift_records (evaluation_run_id, tenant_id, workspace_id, business_id, drift_type, magnitude)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [evaluationRunId, ctx.tenantId, ctx.workspaceId, businessId, driftType, magnitude]
      );
      return result.rows[0].id as string;
    });
  }

  async recordBias(ctx: TenantContext, evaluationRunId: string, businessId: string, biasType: string, magnitude: number): Promise<string> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.model_bias_records (evaluation_run_id, tenant_id, workspace_id, business_id, bias_type, magnitude)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [evaluationRunId, ctx.tenantId, ctx.workspaceId, businessId, biasType, magnitude]
      );
      return result.rows[0].id as string;
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ModelEvaluationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.model_evaluation_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ModelEvaluationNotFoundError('ModelEvaluationRun', id);
      return rowToRun(result.rows[0]);
    });
  }
}
