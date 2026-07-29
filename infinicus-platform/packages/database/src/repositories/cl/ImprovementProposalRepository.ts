import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import {
  ImprovementProposalNotFoundError,
  ImprovementProposalImmutableError,
} from './errors.js';

export interface ImprovementProposal {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  learningCaseId: string;
  proposalCode: string;
  status: string;
  latestVersion: number;
}

export interface ImprovementProposalVersion {
  id: string;
  proposalId: string;
  versionNumber: number;
  summary: string;
  status: string;
  correlationId: string;
}

const DECIDED_STATUSES = new Set(['approved', 'rejected']);

function rowToProposal(row: Record<string, unknown>): ImprovementProposal {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    learningCaseId: row.learning_case_id as string,
    proposalCode: row.proposal_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToVersion(row: Record<string, unknown>): ImprovementProposalVersion {
  return {
    id: row.id as string,
    proposalId: row.proposal_id as string,
    versionNumber: row.version_number as number,
    summary: row.summary as string,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class ImprovementProposalRepository {
  async createProposal(ctx: TenantContext, businessId: string, learningCaseId: string, proposalCode: string, summary: string): Promise<{ proposal: ImprovementProposal; version: ImprovementProposalVersion }> {
    return withTenantTransaction(ctx, async (client) => {
      const propRow = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.improvement_proposals (tenant_id, workspace_id, business_id, learning_case_id, proposal_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, learningCaseId, proposalCode]
      );
      const correlationId = randomUUID();
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.improvement_proposal_versions (proposal_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING *`,
        [propRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, summary, correlationId]
      );
      return { proposal: rowToProposal(propRow.rows[0]), version: rowToVersion(versionResult.rows[0]) };
    });
  }

  async addImpact(ctx: TenantContext, proposalVersionId: string, businessId: string, impactType: string, magnitude: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.improvement_impacts (proposal_version_id, tenant_id, workspace_id, business_id, impact_type, magnitude)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [proposalVersionId, ctx.tenantId, ctx.workspaceId, businessId, impactType, JSON.stringify(magnitude)]
      );
    });
  }

  async addRisk(ctx: TenantContext, proposalVersionId: string, businessId: string, riskCode: string, description: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.improvement_risks (proposal_version_id, tenant_id, workspace_id, business_id, risk_code, description, severity)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [proposalVersionId, ctx.tenantId, ctx.workspaceId, businessId, riskCode, description, severity]
      );
    });
  }

  private async decide(ctx: TenantContext, proposalId: string, proposalVersionId: string, toStatus: string): Promise<ImprovementProposal> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.improvement_proposals WHERE id = $1', [proposalId]);
      if (current.rows.length === 0) throw new ImprovementProposalNotFoundError('ImprovementProposal', proposalId);
      if (DECIDED_STATUSES.has(current.rows[0].status as string)) {
        throw new ImprovementProposalImmutableError('ImprovementProposal', 'decided proposals cannot be redecided');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.improvement_proposals SET status = $2 WHERE id = $1 RETURNING *`,
        [proposalId, toStatus]
      );
      await client.query(`UPDATE continuous_learning.improvement_proposal_versions SET status = $2 WHERE id = $1`, [proposalVersionId, toStatus]);
      return rowToProposal(result.rows[0]);
    });
  }

  /** Learning may propose governed changes but must never silently mutate frozen historical evidence, decisions, approvals, or outcomes — this only records the decision. */
  async approve(ctx: TenantContext, proposalId: string, proposalVersionId: string): Promise<ImprovementProposal> {
    return this.decide(ctx, proposalId, proposalVersionId, 'approved');
  }

  async reject(ctx: TenantContext, proposalId: string, proposalVersionId: string): Promise<ImprovementProposal> {
    return this.decide(ctx, proposalId, proposalVersionId, 'rejected');
  }

  /** Only legal before a proposal is decided — decided proposals are immutable (enforced by the database trigger). */
  async supersede(ctx: TenantContext, proposalId: string): Promise<ImprovementProposal> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.improvement_proposals WHERE id = $1', [proposalId]);
      if (current.rows.length === 0) throw new ImprovementProposalNotFoundError('ImprovementProposal', proposalId);
      if (DECIDED_STATUSES.has(current.rows[0].status as string)) {
        throw new ImprovementProposalImmutableError('ImprovementProposal', 'decided proposals cannot be superseded in place');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.improvement_proposals SET status = 'superseded' WHERE id = $1 RETURNING *`,
        [proposalId]
      );
      return rowToProposal(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ImprovementProposal> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.improvement_proposals WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ImprovementProposalNotFoundError('ImprovementProposal', id);
      return rowToProposal(result.rows[0]);
    });
  }

  async getDecidedForCase(ctx: TenantContext, learningCaseId: string): Promise<ImprovementProposal[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM continuous_learning.improvement_proposals WHERE learning_case_id = $1 AND status IN ('approved','rejected') ORDER BY created_at DESC`,
        [learningCaseId]
      );
      return result.rows.map(rowToProposal);
    });
  }
}
