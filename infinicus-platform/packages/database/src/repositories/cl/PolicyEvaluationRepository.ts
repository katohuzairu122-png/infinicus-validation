import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { PolicyEvaluationNotFoundError, PolicyChangeProposalNotFoundError } from './errors.js';

export interface PolicyEvaluationRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  approvalPolicyId: string | null;
  learningCaseId: string | null;
  status: string;
}

export interface PolicyChangeProposal {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  evaluationRunId: string;
  proposalCode: string;
  rationale: string;
  status: string;
}

const RUN_STATUSES = ['queued', 'running', 'completed', 'failed'];

function rowToRun(row: Record<string, unknown>): PolicyEvaluationRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    approvalPolicyId: row.approval_policy_id as string | null,
    learningCaseId: row.learning_case_id as string | null,
    status: row.status as string,
  };
}

function rowToProposal(row: Record<string, unknown>): PolicyChangeProposal {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    evaluationRunId: row.evaluation_run_id as string,
    proposalCode: row.proposal_code as string,
    rationale: row.rationale as string,
    status: row.status as string,
  };
}

export class PolicyEvaluationRepository {
  async requestRun(ctx: TenantContext, businessId: string, approvalPolicyId: string | null = null, learningCaseId: string | null = null): Promise<PolicyEvaluationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.policy_evaluation_runs (tenant_id, workspace_id, business_id, approval_policy_id, learning_case_id)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, approvalPolicyId, learningCaseId]
      );
      return rowToRun(result.rows[0]);
    });
  }

  private async transitionRun(ctx: TenantContext, id: string, toStatus: string): Promise<PolicyEvaluationRun> {
    if (!RUN_STATUSES.includes(toStatus)) {
      throw new PolicyEvaluationNotFoundError('PolicyEvaluationRun', id);
    }
    return withTenantTransaction(ctx, async (client) => {
      const extra = toStatus === 'completed' || toStatus === 'failed' ? ', completed_at = now()' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.policy_evaluation_runs SET status = $2${extra} WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new PolicyEvaluationNotFoundError('PolicyEvaluationRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async markRunning(ctx: TenantContext, id: string): Promise<PolicyEvaluationRun> {
    return this.transitionRun(ctx, id, 'running');
  }

  async complete(ctx: TenantContext, id: string): Promise<PolicyEvaluationRun> {
    return this.transitionRun(ctx, id, 'completed');
  }

  async fail(ctx: TenantContext, id: string): Promise<PolicyEvaluationRun> {
    return this.transitionRun(ctx, id, 'failed');
  }

  async addResult(ctx: TenantContext, evaluationRunId: string, businessId: string, findingCode: string, detail: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.policy_evaluation_results (evaluation_run_id, tenant_id, workspace_id, business_id, finding_code, detail)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [evaluationRunId, ctx.tenantId, ctx.workspaceId, businessId, findingCode, JSON.stringify(detail)]
      );
    });
  }

  async proposeChange(ctx: TenantContext, businessId: string, evaluationRunId: string, proposalCode: string, rationale: string): Promise<PolicyChangeProposal> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.policy_change_proposals (tenant_id, workspace_id, business_id, evaluation_run_id, proposal_code, rationale, status)
         VALUES ($1,$2,$3,$4,$5,$6,'proposed') RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, evaluationRunId, proposalCode, rationale]
      );
      return rowToProposal(result.rows[0]);
    });
  }

  async withdrawChange(ctx: TenantContext, id: string): Promise<PolicyChangeProposal> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.policy_change_proposals SET status = 'withdrawn' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new PolicyChangeProposalNotFoundError('PolicyChangeProposal', id);
      return rowToProposal(result.rows[0]);
    });
  }

  async addChangeEvidence(ctx: TenantContext, policyChangeProposalId: string, businessId: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.policy_change_evidence (policy_change_proposal_id, tenant_id, workspace_id, business_id, evidence_reference)
         VALUES ($1,$2,$3,$4,$5)`,
        [policyChangeProposalId, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(evidenceReference)]
      );
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<PolicyEvaluationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.policy_evaluation_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new PolicyEvaluationNotFoundError('PolicyEvaluationRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async getProposalById(ctx: TenantContext, id: string): Promise<PolicyChangeProposal> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.policy_change_proposals WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new PolicyChangeProposalNotFoundError('PolicyChangeProposal', id);
      return rowToProposal(result.rows[0]);
    });
  }
}
