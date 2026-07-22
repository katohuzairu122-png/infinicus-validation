import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ApprovalExceptionNotFoundError, ValidationError } from './errors.js';

export interface ApprovalException {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  reviewPackageId: string;
  exceptionCode: string;
  reason: string;
  status: string;
}

const VALID_STATUSES = ['open', 'resolved', 'denied'];

function rowToException(row: Record<string, unknown>): ApprovalException {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    reviewPackageId: row.review_package_id as string,
    exceptionCode: row.exception_code as string,
    reason: row.reason as string,
    status: row.status as string,
  };
}

export class ApprovalExceptionRepository {
  async createException(ctx: TenantContext, businessId: string, reviewPackageId: string, exceptionCode: string, reason: string): Promise<ApprovalException> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.approval_exceptions (tenant_id, workspace_id, business_id, review_package_id, exception_code, reason)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, reviewPackageId, exceptionCode, reason]
      );
      return rowToException(result.rows[0]);
    });
  }

  async addEvidence(ctx: TenantContext, exceptionId: string, businessId: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.approval_exception_evidence (exception_id, tenant_id, workspace_id, business_id, evidence_reference)
         VALUES ($1,$2,$3,$4,$5)`,
        [exceptionId, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(evidenceReference)]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, exceptionId: string, toStatus: string): Promise<ApprovalException> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('ApprovalException', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE approved_business_action.approval_exceptions SET status = $2 WHERE id = $1 RETURNING *`,
        [exceptionId, toStatus]
      );
      if (result.rows.length === 0) throw new ApprovalExceptionNotFoundError('ApprovalException', exceptionId);
      return rowToException(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ApprovalException> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.approval_exceptions WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ApprovalExceptionNotFoundError('ApprovalException', id);
      return rowToException(result.rows[0]);
    });
  }
}
