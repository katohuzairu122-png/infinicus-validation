import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { OutcomeTargetNotFoundError } from './errors.js';

export interface OutcomeTarget {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  monitoringPlanId: string;
  targetCode: string;
  status: string;
  latestVersion: number;
}

function rowToTarget(row: Record<string, unknown>): OutcomeTarget {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    monitoringPlanId: row.monitoring_plan_id as string,
    targetCode: row.target_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class OutcomeTargetRepository {
  async createTarget(ctx: TenantContext, businessId: string, monitoringPlanId: string, targetCode: string, specification: Record<string, unknown>): Promise<{ target: OutcomeTarget; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const targetRow = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_targets (tenant_id, workspace_id, business_id, monitoring_plan_id, target_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, monitoringPlanId, targetCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_target_versions (target_id, tenant_id, workspace_id, business_id, version_number, specification, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [targetRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(specification), randomUUID()]
      );
      return { target: rowToTarget(targetRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addThreshold(ctx: TenantContext, targetVersionId: string, businessId: string, thresholdCode: string, operator: string, operand: Record<string, unknown>): Promise<string> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_thresholds (target_version_id, tenant_id, workspace_id, business_id, threshold_code, operator, operand)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [targetVersionId, ctx.tenantId, ctx.workspaceId, businessId, thresholdCode, operator, JSON.stringify(operand)]
      );
      return result.rows[0].id as string;
    });
  }

  async recordBreach(ctx: TenantContext, thresholdId: string, businessId: string, observationId: string, detail: Record<string, unknown> = {}): Promise<string> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.threshold_breaches (threshold_id, tenant_id, workspace_id, business_id, observation_id, detail)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [thresholdId, ctx.tenantId, ctx.workspaceId, businessId, observationId, JSON.stringify(detail)]
      );
      return result.rows[0].id as string;
    });
  }

  async activate(ctx: TenantContext, id: string): Promise<OutcomeTarget> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.outcome_targets SET status = 'active' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new OutcomeTargetNotFoundError('OutcomeTarget', id);
      return rowToTarget(result.rows[0]);
    });
  }

  async retire(ctx: TenantContext, id: string): Promise<OutcomeTarget> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.outcome_targets SET status = 'retired' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new OutcomeTargetNotFoundError('OutcomeTarget', id);
      return rowToTarget(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<OutcomeTarget> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.outcome_targets WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new OutcomeTargetNotFoundError('OutcomeTarget', id);
      return rowToTarget(result.rows[0]);
    });
  }

  async listByPlan(ctx: TenantContext, monitoringPlanId: string): Promise<OutcomeTarget[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM outcome_monitoring.outcome_targets WHERE monitoring_plan_id = $1 ORDER BY created_at DESC',
        [monitoringPlanId]
      );
      return result.rows.map(rowToTarget);
    });
  }
}
