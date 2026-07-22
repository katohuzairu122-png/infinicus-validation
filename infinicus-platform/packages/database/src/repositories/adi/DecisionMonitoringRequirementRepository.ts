import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { DecisionMonitoringRequirementNotFoundError, ValidationError } from './errors.js';

export interface DecisionMonitoringRequirement {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  recommendationVersionId: string;
  requirementCode: string;
  description: string;
  status: string;
}

export interface DecisionReviewSchedule {
  id: string;
  monitoringRequirementId: string;
  scheduledAt: Date;
  status: string;
  completedAt: Date | null;
}

const REQUIREMENT_STATUSES = ['draft', 'active', 'retired'];

function rowToRequirement(row: Record<string, unknown>): DecisionMonitoringRequirement {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    recommendationVersionId: row.recommendation_version_id as string,
    requirementCode: row.requirement_code as string,
    description: row.description as string,
    status: row.status as string,
  };
}

function rowToSchedule(row: Record<string, unknown>): DecisionReviewSchedule {
  return {
    id: row.id as string,
    monitoringRequirementId: row.monitoring_requirement_id as string,
    scheduledAt: row.scheduled_at as Date,
    status: row.status as string,
    completedAt: row.completed_at as Date | null,
  };
}

export class DecisionMonitoringRequirementRepository {
  async createRequirement(ctx: TenantContext, businessId: string, recommendationVersionId: string, requirementCode: string, description: string): Promise<DecisionMonitoringRequirement> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_monitoring_requirements (tenant_id, workspace_id, business_id, recommendation_version_id, requirement_code, description)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, recommendationVersionId, requirementCode, description]
      );
      return rowToRequirement(result.rows[0]);
    });
  }

  async addMetric(ctx: TenantContext, monitoringRequirementId: string, businessId: string, metricCode: string, targetValue: unknown, unit?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_monitoring_metrics (monitoring_requirement_id, tenant_id, workspace_id, business_id, metric_code, target_value, unit)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [monitoringRequirementId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, JSON.stringify(targetValue), unit ?? null]
      );
    });
  }

  async scheduleReview(ctx: TenantContext, monitoringRequirementId: string, businessId: string, scheduledAt: Date): Promise<DecisionReviewSchedule> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_review_schedules (monitoring_requirement_id, tenant_id, workspace_id, business_id, scheduled_at)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [monitoringRequirementId, ctx.tenantId, ctx.workspaceId, businessId, scheduledAt]
      );
      return rowToSchedule(result.rows[0]);
    });
  }

  async completeReview(ctx: TenantContext, reviewScheduleId: string): Promise<DecisionReviewSchedule> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_review_schedules SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
        [reviewScheduleId]
      );
      if (result.rows.length === 0) throw new DecisionMonitoringRequirementNotFoundError('DecisionReviewSchedule', reviewScheduleId);
      return rowToSchedule(result.rows[0]);
    });
  }

  async skipReview(ctx: TenantContext, reviewScheduleId: string): Promise<DecisionReviewSchedule> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_review_schedules SET status = 'skipped' WHERE id = $1 RETURNING *`,
        [reviewScheduleId]
      );
      if (result.rows.length === 0) throw new DecisionMonitoringRequirementNotFoundError('DecisionReviewSchedule', reviewScheduleId);
      return rowToSchedule(result.rows[0]);
    });
  }

  async transitionStatus(ctx: TenantContext, monitoringRequirementId: string, toStatus: string): Promise<DecisionMonitoringRequirement> {
    if (!REQUIREMENT_STATUSES.includes(toStatus)) {
      throw new ValidationError('DecisionMonitoringRequirement', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_monitoring_requirements SET status = $2 WHERE id = $1 RETURNING *`,
        [monitoringRequirementId, toStatus]
      );
      if (result.rows.length === 0) throw new DecisionMonitoringRequirementNotFoundError('DecisionMonitoringRequirement', monitoringRequirementId);
      return rowToRequirement(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DecisionMonitoringRequirement> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_monitoring_requirements WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DecisionMonitoringRequirementNotFoundError('DecisionMonitoringRequirement', id);
      return rowToRequirement(result.rows[0]);
    });
  }
}
