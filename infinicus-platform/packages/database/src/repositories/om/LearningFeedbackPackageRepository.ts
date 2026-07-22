import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { LearningFeedbackPackageNotFoundError, LearningFeedbackPackageStateConflictError } from './errors.js';

export interface LearningFeedbackPackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  reviewId: string;
  packageCode: string;
  status: string;
  latestVersion: number;
}

function rowToPackage(row: Record<string, unknown>): LearningFeedbackPackage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    reviewId: row.review_id as string,
    packageCode: row.package_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class LearningFeedbackPackageRepository {
  async createPackage(ctx: TenantContext, businessId: string, reviewId: string, packageCode: string, summary: string): Promise<{ package: LearningFeedbackPackage; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const pkgRow = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.learning_feedback_packages (tenant_id, workspace_id, business_id, review_id, package_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, reviewId, packageCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.learning_feedback_package_versions (feedback_package_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [pkgRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, summary, randomUUID()]
      );
      return { package: rowToPackage(pkgRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addEvidence(ctx: TenantContext, feedbackPackageVersionId: string, businessId: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.learning_feedback_evidence (feedback_package_version_id, tenant_id, workspace_id, business_id, evidence_reference)
         VALUES ($1,$2,$3,$4,$5)`,
        [feedbackPackageVersionId, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(evidenceReference)]
      );
    });
  }

  async markReady(ctx: TenantContext, id: string): Promise<LearningFeedbackPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.learning_feedback_packages SET status = 'ready' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearningFeedbackPackageNotFoundError('LearningFeedbackPackage', id);
      return rowToPackage(result.rows[0]);
    });
  }

  /** Marked published only once the OM→CL handoff has actually been dispatched. */
  async markPublished(ctx: TenantContext, id: string): Promise<LearningFeedbackPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.learning_feedback_packages WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new LearningFeedbackPackageNotFoundError('LearningFeedbackPackage', id);
      if (current.rows[0].status !== 'ready') {
        throw new LearningFeedbackPackageStateConflictError('LearningFeedbackPackage', 'only a ready package may be marked published');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.learning_feedback_packages SET status = 'published' WHERE id = $1 RETURNING *`, [id]
      );
      return rowToPackage(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<LearningFeedbackPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.learning_feedback_packages WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new LearningFeedbackPackageNotFoundError('LearningFeedbackPackage', id);
      return rowToPackage(result.rows[0]);
    });
  }

  async getReadyForReview(ctx: TenantContext, reviewId: string): Promise<LearningFeedbackPackage[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM outcome_monitoring.learning_feedback_packages WHERE review_id = $1 AND status IN ('ready','published') ORDER BY created_at DESC`,
        [reviewId]
      );
      return result.rows.map(rowToPackage);
    });
  }
}
