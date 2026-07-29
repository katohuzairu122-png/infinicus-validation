import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ApprovalPolicyNotFoundError, ValidationError } from './errors.js';

export interface ApprovalPolicy {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  policyCode: string;
  name: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['draft', 'active', 'retired', 'superseded'];
const OPERATORS = new Set(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']);

function rowToPolicy(row: Record<string, unknown>): ApprovalPolicy {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    policyCode: row.policy_code as string,
    name: row.name as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class ApprovalPolicyRepository {
  async createPolicy(ctx: TenantContext, businessId: string, policyCode: string, name: string): Promise<ApprovalPolicy> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.approval_policies (tenant_id, workspace_id, business_id, policy_code, name)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, policyCode, name]
      );
      return rowToPolicy(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, policyId: string, businessId: string, specification: Record<string, unknown> = {}): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const p = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.approval_policies WHERE id = $1', [policyId]);
      if (p.rows.length === 0) throw new ApprovalPolicyNotFoundError('ApprovalPolicy', policyId);
      const nextVersion = (p.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.approval_policy_versions
           (policy_id, tenant_id, workspace_id, business_id, version_number, specification, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [policyId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(specification)]
      );
      await client.query('UPDATE approved_business_action.approval_policies SET latest_version = $2 WHERE id = $1', [policyId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addRule(ctx: TenantContext, policyVersionId: string, businessId: string, ruleCode: string, operator: string, operand: unknown): Promise<void> {
    if (!OPERATORS.has(operator)) {
      throw new ValidationError('ApprovalPolicyRule', [`unknown operator: ${operator}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.approval_policy_rules (policy_version_id, tenant_id, workspace_id, business_id, rule_code, operator, operand)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [policyVersionId, ctx.tenantId, ctx.workspaceId, businessId, ruleCode, operator, JSON.stringify(operand)]
      );
    });
  }

  async recordEvaluation(ctx: TenantContext, policyVersionId: string, reviewPackageVersionId: string, businessId: string, passed: boolean, evaluatedValue?: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.approval_policy_evaluations (policy_version_id, review_package_version_id, tenant_id, workspace_id, business_id, passed, evaluated_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [policyVersionId, reviewPackageVersionId, ctx.tenantId, ctx.workspaceId, businessId, passed, evaluatedValue === undefined ? null : JSON.stringify(evaluatedValue)]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, policyId: string, toStatus: string): Promise<ApprovalPolicy> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('ApprovalPolicy', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.approval_policies WHERE id = $1', [policyId]);
      if (current.rows.length === 0) throw new ApprovalPolicyNotFoundError('ApprovalPolicy', policyId);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE approved_business_action.approval_policies SET status = $2 WHERE id = $1 RETURNING *`,
        [policyId, toStatus]
      );
      return rowToPolicy(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ApprovalPolicy> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.approval_policies WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ApprovalPolicyNotFoundError('ApprovalPolicy', id);
      return rowToPolicy(result.rows[0]);
    });
  }

  async listActivePolicies(ctx: TenantContext, businessId: string): Promise<ApprovalPolicy[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM approved_business_action.approval_policies WHERE business_id = $1 AND status = 'active' ORDER BY created_at`,
        [businessId]
      );
      return result.rows.map(rowToPolicy);
    });
  }
}
