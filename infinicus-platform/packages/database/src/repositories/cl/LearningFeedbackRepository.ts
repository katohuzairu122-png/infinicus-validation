import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { LearningFeedbackNotFoundError } from './errors.js';

export interface LearningFeedbackRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  learningCaseId: string;
  feedbackCode: string;
  status: string;
  latestVersion: number;
}

function rowToRecord(row: Record<string, unknown>): LearningFeedbackRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    learningCaseId: row.learning_case_id as string,
    feedbackCode: row.feedback_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class LearningFeedbackRepository {
  async createRecord(ctx: TenantContext, businessId: string, learningCaseId: string, feedbackCode: string, summary: string): Promise<{ record: LearningFeedbackRecord; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const recRow = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_feedback_records (tenant_id, workspace_id, business_id, learning_case_id, feedback_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, learningCaseId, feedbackCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_feedback_versions (feedback_record_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [recRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, summary, randomUUID()]
      );
      return { record: rowToRecord(recRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addLink(ctx: TenantContext, feedbackVersionId: string, businessId: string, linkType: string, linkedReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.learning_feedback_links (feedback_version_id, tenant_id, workspace_id, business_id, link_type, linked_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [feedbackVersionId, ctx.tenantId, ctx.workspaceId, businessId, linkType, JSON.stringify(linkedReference)]
      );
    });
  }

  async recordQuality(ctx: TenantContext, feedbackVersionId: string, businessId: string, qualityScore: number): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.learning_feedback_quality (feedback_version_id, tenant_id, workspace_id, business_id, quality_score)
         VALUES ($1,$2,$3,$4,$5)`,
        [feedbackVersionId, ctx.tenantId, ctx.workspaceId, businessId, qualityScore]
      );
    });
  }

  async activate(ctx: TenantContext, id: string): Promise<LearningFeedbackRecord> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learning_feedback_records SET status = 'active' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearningFeedbackNotFoundError('LearningFeedbackRecord', id);
      return rowToRecord(result.rows[0]);
    });
  }

  async supersede(ctx: TenantContext, id: string): Promise<LearningFeedbackRecord> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learning_feedback_records SET status = 'superseded' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearningFeedbackNotFoundError('LearningFeedbackRecord', id);
      return rowToRecord(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<LearningFeedbackRecord> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.learning_feedback_records WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new LearningFeedbackNotFoundError('LearningFeedbackRecord', id);
      return rowToRecord(result.rows[0]);
    });
  }

  async listByCase(ctx: TenantContext, learningCaseId: string): Promise<LearningFeedbackRecord[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM continuous_learning.learning_feedback_records WHERE learning_case_id = $1 ORDER BY created_at DESC',
        [learningCaseId]
      );
      return result.rows.map(rowToRecord);
    });
  }
}
