import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, InvalidTransitionError } from './errors.js';

export interface ScenarioComparisonRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  comparisonCode: string;
  objective: string;
  status: string;
  correlationId: string;
}

const TRANSITIONS: Record<string, readonly string[]> = {
  requested: ['running', 'cancelled'],
  running: ['completed', 'failed', 'cancelled'],
};

function rowToRun(row: Record<string, unknown>): ScenarioComparisonRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    comparisonCode: row.comparison_code as string,
    objective: row.objective as string,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class ScenarioComparisonRepository {
  async createRun(ctx: TenantContext, businessId: string, comparisonCode: string, objective: string): Promise<ScenarioComparisonRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.scenario_comparison_runs (tenant_id, workspace_id, business_id, comparison_code, objective)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, comparisonCode, objective]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async addMember(ctx: TenantContext, comparisonRunId: string, businessId: string, runId: string, label: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.scenario_comparison_members (comparison_run_id, tenant_id, workspace_id, business_id, run_id, label)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [comparisonRunId, ctx.tenantId, ctx.workspaceId, businessId, runId, label]
      );
    });
  }

  async transitionRun(ctx: TenantContext, id: string, toStatus: string): Promise<ScenarioComparisonRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.scenario_comparison_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('ScenarioComparisonRun', id);
      const fromStatus = current.rows[0].status as string;
      if (!(TRANSITIONS[fromStatus] ?? []).includes(toStatus)) {
        throw new InvalidTransitionError('ScenarioComparisonRun', fromStatus, toStatus);
      }
      const timestampClause = toStatus === 'running' ? ', started_at = now()' : ['completed', 'failed', 'cancelled'].includes(toStatus) ? ', completed_at = now()' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.scenario_comparison_runs SET status = $2${timestampClause} WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async recordResult(ctx: TenantContext, comparisonRunId: string, businessId: string, metricCode: string, resultJson: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.scenario_comparison_results (comparison_run_id, tenant_id, workspace_id, business_id, metric_code, result_json)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [comparisonRunId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, JSON.stringify(resultJson)]
      );
    });
  }

  async getRun(ctx: TenantContext, id: string): Promise<ScenarioComparisonRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM simulation.scenario_comparison_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('ScenarioComparisonRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async listMembers(ctx: TenantContext, comparisonRunId: string): Promise<Array<{ id: string; runId: string; label: string }>> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM simulation.scenario_comparison_members WHERE comparison_run_id = $1', [comparisonRunId]
      );
      return result.rows.map((r) => ({ id: r.id as string, runId: r.run_id as string, label: r.label as string }));
    });
  }
}
