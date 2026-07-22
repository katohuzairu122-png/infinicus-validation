import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { OutcomeReviewNotFoundError, OutcomeReviewStateConflictError } from './errors.js';

export interface OutcomeReview {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  observationId: string;
  reviewCode: string;
  status: string;
}

const VALID_STATUSES = ['in_review', 'completed', 'cancelled'];

function rowToReview(row: Record<string, unknown>): OutcomeReview {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    observationId: row.observation_id as string,
    reviewCode: row.review_code as string,
    status: row.status as string,
  };
}

export class OutcomeReviewRepository {
  async createReview(ctx: TenantContext, businessId: string, observationId: string, reviewCode: string): Promise<OutcomeReview> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.outcome_reviews (tenant_id, workspace_id, business_id, observation_id, review_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, observationId, reviewCode]
      );
      return rowToReview(result.rows[0]);
    });
  }

  async addFinding(ctx: TenantContext, reviewId: string, businessId: string, findingCode: string, statement: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.outcome_review_findings (review_id, tenant_id, workspace_id, business_id, finding_code, statement)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [reviewId, ctx.tenantId, ctx.workspaceId, businessId, findingCode, statement]
      );
    });
  }

  async addAction(ctx: TenantContext, reviewId: string, businessId: string, actionCode: string, description: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.outcome_review_actions (review_id, tenant_id, workspace_id, business_id, action_code, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [reviewId, ctx.tenantId, ctx.workspaceId, businessId, actionCode, description]
      );
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, reason?: string): Promise<OutcomeReview> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new OutcomeReviewStateConflictError('OutcomeReview', `unknown status: ${toStatus}`);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.outcome_reviews WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new OutcomeReviewNotFoundError('OutcomeReview', id);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.outcome_reviews SET status = $2 WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      await client.query(
        `INSERT INTO outcome_monitoring.outcome_review_status_history (review_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null, randomUUID()]
      );
      return rowToReview(result.rows[0]);
    });
  }

  async startReview(ctx: TenantContext, id: string): Promise<OutcomeReview> {
    return this.transition(ctx, id, 'in_review');
  }

  async completeReview(ctx: TenantContext, id: string): Promise<OutcomeReview> {
    return this.transition(ctx, id, 'completed');
  }

  async cancelReview(ctx: TenantContext, id: string, reason: string): Promise<OutcomeReview> {
    return this.transition(ctx, id, 'cancelled', reason);
  }

  async getById(ctx: TenantContext, id: string): Promise<OutcomeReview> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.outcome_reviews WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new OutcomeReviewNotFoundError('OutcomeReview', id);
      return rowToReview(result.rows[0]);
    });
  }

  async listByObservation(ctx: TenantContext, observationId: string): Promise<OutcomeReview[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM outcome_monitoring.outcome_reviews WHERE observation_id = $1 ORDER BY created_at DESC',
        [observationId]
      );
      return result.rows.map(rowToReview);
    });
  }
}
