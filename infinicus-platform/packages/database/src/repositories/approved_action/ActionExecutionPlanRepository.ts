import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ActionExecutionPlanNotFoundError, ValidationError } from './errors.js';

export interface ActionExecutionPlan {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  approvedActionId: string;
  planCode: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['draft', 'ready', 'active', 'completed', 'cancelled'];
const DEPENDENCY_TYPES = new Set(['blocks', 'requires']);

function rowToPlan(row: Record<string, unknown>): ActionExecutionPlan {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    approvedActionId: row.approved_action_id as string,
    planCode: row.plan_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class ActionExecutionPlanRepository {
  async createPlan(ctx: TenantContext, businessId: string, approvedActionId: string, planCode: string): Promise<ActionExecutionPlan> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.action_execution_plans (tenant_id, workspace_id, business_id, approved_action_id, plan_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, approvedActionId, planCode]
      );
      return rowToPlan(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, planId: string, businessId: string, summary: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const p = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.action_execution_plans WHERE id = $1', [planId]);
      if (p.rows.length === 0) throw new ActionExecutionPlanNotFoundError('ActionExecutionPlan', planId);
      const nextVersion = (p.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.action_execution_plan_versions
           (plan_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [planId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, summary]
      );
      await client.query('UPDATE approved_business_action.action_execution_plans SET latest_version = $2 WHERE id = $1', [planId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addDependency(ctx: TenantContext, planVersionId: string, businessId: string, dependencyType: string, dependsOnPlanId?: string): Promise<void> {
    if (!DEPENDENCY_TYPES.has(dependencyType)) {
      throw new ValidationError('ActionExecutionDependency', [`unknown dependency_type: ${dependencyType}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.action_execution_dependencies (plan_version_id, tenant_id, workspace_id, business_id, depends_on_plan_id, dependency_type)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [planVersionId, ctx.tenantId, ctx.workspaceId, businessId, dependsOnPlanId ?? null, dependencyType]
      );
    });
  }

  async addWindow(ctx: TenantContext, planVersionId: string, businessId: string, windowType: string, startsAt: Date, endsAt?: Date): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.action_execution_windows (plan_version_id, tenant_id, workspace_id, business_id, window_type, starts_at, ends_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [planVersionId, ctx.tenantId, ctx.workspaceId, businessId, windowType, startsAt, endsAt ?? null]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, planId: string, toStatus: string): Promise<ActionExecutionPlan> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('ActionExecutionPlan', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.action_execution_plans WHERE id = $1', [planId]);
      if (current.rows.length === 0) throw new ActionExecutionPlanNotFoundError('ActionExecutionPlan', planId);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE approved_business_action.action_execution_plans SET status = $2 WHERE id = $1 RETURNING *`,
        [planId, toStatus]
      );
      return rowToPlan(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ActionExecutionPlan> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.action_execution_plans WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ActionExecutionPlanNotFoundError('ActionExecutionPlan', id);
      return rowToPlan(result.rows[0]);
    });
  }
}
