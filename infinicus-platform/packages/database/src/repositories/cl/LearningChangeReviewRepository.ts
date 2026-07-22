import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { LearningChangeReviewNotFoundError, LearningChangeReviewStateConflictError } from './errors.js';

export interface LearningChangeReview {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  improvementProposalId: string;
  reviewCode: string;
  status: string;
}

export interface LearningChangeRelease {
  id: string;
  improvementProposalId: string;
  releaseCode: string;
  environment: string;
}

const VALID_STATUSES = ['in_review', 'completed', 'cancelled'];

function rowToReview(row: Record<string, unknown>): LearningChangeReview {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    improvementProposalId: row.improvement_proposal_id as string,
    reviewCode: row.review_code as string,
    status: row.status as string,
  };
}

function rowToRelease(row: Record<string, unknown>): LearningChangeRelease {
  return {
    id: row.id as string,
    improvementProposalId: row.improvement_proposal_id as string,
    releaseCode: row.release_code as string,
    environment: row.environment as string,
  };
}

export class LearningChangeReviewRepository {
  async createReview(ctx: TenantContext, businessId: string, improvementProposalId: string, reviewCode: string): Promise<LearningChangeReview> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_change_reviews (tenant_id, workspace_id, business_id, improvement_proposal_id, review_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, improvementProposalId, reviewCode]
      );
      return rowToReview(result.rows[0]);
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string): Promise<LearningChangeReview> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new LearningChangeReviewStateConflictError('LearningChangeReview', `unknown status: ${toStatus}`);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learning_change_reviews SET status = $2 WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new LearningChangeReviewNotFoundError('LearningChangeReview', id);
      return rowToReview(result.rows[0]);
    });
  }

  async startReview(ctx: TenantContext, id: string): Promise<LearningChangeReview> {
    return this.transition(ctx, id, 'in_review');
  }

  async completeReview(ctx: TenantContext, id: string): Promise<LearningChangeReview> {
    return this.transition(ctx, id, 'completed');
  }

  async cancelReview(ctx: TenantContext, id: string): Promise<LearningChangeReview> {
    return this.transition(ctx, id, 'cancelled');
  }

  async recordDecision(ctx: TenantContext, reviewId: string, businessId: string, outcome: 'approved' | 'rejected', rationale: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.learning_change_decisions (review_id, tenant_id, workspace_id, business_id, outcome, rationale)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [reviewId, ctx.tenantId, ctx.workspaceId, businessId, outcome, rationale]
      );
    });
  }

  async recordRelease(ctx: TenantContext, businessId: string, improvementProposalId: string, releaseCode: string, environment = 'staging'): Promise<LearningChangeRelease> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_change_releases (tenant_id, workspace_id, business_id, improvement_proposal_id, release_code, environment)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, improvementProposalId, releaseCode, environment]
      );
      return rowToRelease(result.rows[0]);
    });
  }

  async recordRollback(ctx: TenantContext, businessId: string, releaseId: string, reason: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.learning_change_rollbacks (release_id, tenant_id, workspace_id, business_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [releaseId, ctx.tenantId, ctx.workspaceId, businessId, reason]
      );
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<LearningChangeReview> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.learning_change_reviews WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new LearningChangeReviewNotFoundError('LearningChangeReview', id);
      return rowToReview(result.rows[0]);
    });
  }
}
