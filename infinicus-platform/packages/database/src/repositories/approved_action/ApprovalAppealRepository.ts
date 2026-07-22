import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ApprovalAppealNotFoundError, ValidationError } from './errors.js';

export interface ApprovalAppeal {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  decisionId: string;
  appealCode: string;
  reason: string;
  status: string;
}

export interface ApprovalAppealDecision {
  id: string;
  appealId: string;
  outcome: string;
  rationale: string;
}

const APPEAL_STATUSES = ['open', 'upheld', 'overturned', 'dismissed'];
const OUTCOMES = new Set(['upheld', 'overturned', 'dismissed']);

function rowToAppeal(row: Record<string, unknown>): ApprovalAppeal {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    decisionId: row.decision_id as string,
    appealCode: row.appeal_code as string,
    reason: row.reason as string,
    status: row.status as string,
  };
}

function rowToAppealDecision(row: Record<string, unknown>): ApprovalAppealDecision {
  return {
    id: row.id as string,
    appealId: row.appeal_id as string,
    outcome: row.outcome as string,
    rationale: row.rationale as string,
  };
}

export class ApprovalAppealRepository {
  async createAppeal(ctx: TenantContext, businessId: string, decisionId: string, appealCode: string, reason: string): Promise<ApprovalAppeal> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.approval_appeals (tenant_id, workspace_id, business_id, decision_id, appeal_code, reason)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, decisionId, appealCode, reason]
      );
      return rowToAppeal(result.rows[0]);
    });
  }

  async recordAppealDecision(ctx: TenantContext, appealId: string, businessId: string, outcome: string, rationale: string): Promise<ApprovalAppealDecision> {
    if (!OUTCOMES.has(outcome)) {
      throw new ValidationError('ApprovalAppealDecision', [`unknown outcome: ${outcome}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.approval_appeal_decisions (appeal_id, tenant_id, workspace_id, business_id, outcome, rationale)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [appealId, ctx.tenantId, ctx.workspaceId, businessId, outcome, rationale]
      );
      await client.query(
        `UPDATE approved_business_action.approval_appeals SET status = $2 WHERE id = $1`,
        [appealId, outcome]
      );
      return rowToAppealDecision(result.rows[0]);
    });
  }

  async transitionStatus(ctx: TenantContext, appealId: string, toStatus: string): Promise<ApprovalAppeal> {
    if (!APPEAL_STATUSES.includes(toStatus)) {
      throw new ValidationError('ApprovalAppeal', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE approved_business_action.approval_appeals SET status = $2 WHERE id = $1 RETURNING *`,
        [appealId, toStatus]
      );
      if (result.rows.length === 0) throw new ApprovalAppealNotFoundError('ApprovalAppeal', appealId);
      return rowToAppeal(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ApprovalAppeal> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.approval_appeals WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ApprovalAppealNotFoundError('ApprovalAppeal', id);
      return rowToAppeal(result.rows[0]);
    });
  }
}
