import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { MonitoringPlanNotFoundError } from './errors.js';

export interface MonitoringPlan {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  intakePackageId: string;
  planCode: string;
  status: string;
  latestVersion: number;
}

function rowToPlan(row: Record<string, unknown>): MonitoringPlan {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    intakePackageId: row.intake_package_id as string,
    planCode: row.plan_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class MonitoringPlanRepository {
  async createPlan(ctx: TenantContext, businessId: string, intakePackageId: string, planCode: string, summary: string): Promise<{ plan: MonitoringPlan; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const planRow = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.monitoring_plans (tenant_id, workspace_id, business_id, intake_package_id, plan_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, intakePackageId, planCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.monitoring_plan_versions (plan_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [planRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, summary, randomUUID()]
      );
      return { plan: rowToPlan(planRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addMetric(ctx: TenantContext, planVersionId: string, businessId: string, metricCode: string, metricType: string, targetValue: Record<string, unknown> | null = null): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.monitoring_plan_metrics (plan_version_id, tenant_id, workspace_id, business_id, metric_code, metric_type, target_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [planVersionId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, metricType, targetValue ? JSON.stringify(targetValue) : null]
      );
    });
  }

  async addSchedule(ctx: TenantContext, planVersionId: string, businessId: string, scheduleType: 'one_time' | 'recurring', startsAt: Date, endsAt: Date | null = null, cadence: string | null = null): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.monitoring_plan_schedules (plan_version_id, tenant_id, workspace_id, business_id, schedule_type, cadence, starts_at, ends_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [planVersionId, ctx.tenantId, ctx.workspaceId, businessId, scheduleType, cadence, startsAt, endsAt]
      );
    });
  }

  async activate(ctx: TenantContext, id: string): Promise<MonitoringPlan> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.monitoring_plans SET status = 'active' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new MonitoringPlanNotFoundError('MonitoringPlan', id);
      return rowToPlan(result.rows[0]);
    });
  }

  async complete(ctx: TenantContext, id: string): Promise<MonitoringPlan> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.monitoring_plans SET status = 'completed' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new MonitoringPlanNotFoundError('MonitoringPlan', id);
      return rowToPlan(result.rows[0]);
    });
  }

  async cancel(ctx: TenantContext, id: string): Promise<MonitoringPlan> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.monitoring_plans SET status = 'cancelled' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new MonitoringPlanNotFoundError('MonitoringPlan', id);
      return rowToPlan(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<MonitoringPlan> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.monitoring_plans WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new MonitoringPlanNotFoundError('MonitoringPlan', id);
      return rowToPlan(result.rows[0]);
    });
  }

  async listByIntakePackage(ctx: TenantContext, intakePackageId: string): Promise<MonitoringPlan[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM outcome_monitoring.monitoring_plans WHERE intake_package_id = $1 ORDER BY created_at DESC',
        [intakePackageId]
      );
      return result.rows.map(rowToPlan);
    });
  }
}
