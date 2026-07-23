import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ActionReviewNotFoundError, ValidationError } from './errors.js';

export interface ActionReviewPackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  intakePackageId: string;
  reviewCode: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['draft', 'in_review', 'completed', 'cancelled'];
const EVIDENCE_TYPES = new Set(['adi_recommendation', 'simulation_result', 'business_intelligence_finding', 'external', 'other']);

function rowToReview(row: Record<string, unknown>): ActionReviewPackage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    intakePackageId: row.intake_package_id as string,
    reviewCode: row.review_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class ActionReviewRepository {
  async createReviewPackage(ctx: TenantContext, businessId: string, intakePackageId: string, reviewCode: string): Promise<ActionReviewPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.action_review_packages (tenant_id, workspace_id, business_id, intake_package_id, review_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, intakePackageId, reviewCode]
      );
      return rowToReview(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, reviewPackageId: string, businessId: string, summary: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const r = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.action_review_packages WHERE id = $1', [reviewPackageId]);
      if (r.rows.length === 0) throw new ActionReviewNotFoundError('ActionReviewPackage', reviewPackageId);
      const nextVersion = (r.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.action_review_package_versions
           (review_package_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [reviewPackageId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, summary]
      );
      await client.query('UPDATE approved_business_action.action_review_packages SET latest_version = $2 WHERE id = $1', [reviewPackageId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addEvidence(ctx: TenantContext, reviewPackageVersionId: string, businessId: string, evidenceType: string, evidenceReference: Record<string, unknown>): Promise<void> {
    if (!EVIDENCE_TYPES.has(evidenceType)) {
      throw new ValidationError('ActionReviewEvidence', [`unknown evidence_type: ${evidenceType}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.action_review_evidence (review_package_version_id, tenant_id, workspace_id, business_id, evidence_type, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [reviewPackageVersionId, ctx.tenantId, ctx.workspaceId, businessId, evidenceType, JSON.stringify(evidenceReference)]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, reviewPackageId: string, toStatus: string, reason?: string): Promise<ActionReviewPackage> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('ActionReviewPackage', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.action_review_packages WHERE id = $1', [reviewPackageId]);
      if (current.rows.length === 0) throw new ActionReviewNotFoundError('ActionReviewPackage', reviewPackageId);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE approved_business_action.action_review_packages SET status = $2 WHERE id = $1 RETURNING *`,
        [reviewPackageId, toStatus]
      );
      await client.query(
        `INSERT INTO approved_business_action.action_review_status_history
           (review_package_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [reviewPackageId, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null, randomUUID()]
      );
      return rowToReview(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ActionReviewPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.action_review_packages WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ActionReviewNotFoundError('ActionReviewPackage', id);
      return rowToReview(result.rows[0]);
    });
  }

  async listForBusiness(ctx: TenantContext, businessId: string): Promise<ActionReviewPackage[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM approved_business_action.action_review_packages WHERE business_id = $1 ORDER BY created_at DESC', [businessId]
      );
      return result.rows.map(rowToReview);
    });
  }
}
