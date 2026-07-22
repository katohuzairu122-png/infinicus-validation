import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { DecisionPolicyNotFoundError, ValidationError } from './errors.js';

export interface DecisionPolicy {
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
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function rowToPolicy(row: Record<string, unknown>): DecisionPolicy {
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

export class DecisionPolicyRepository {
  async createPolicy(ctx: TenantContext, businessId: string, policyCode: string, name: string): Promise<DecisionPolicy> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_policies (tenant_id, workspace_id, business_id, policy_code, name)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, policyCode, name]
      );
      return rowToPolicy(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, policyId: string, businessId: string, specification: Record<string, unknown> = {}): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const p = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_policies WHERE id = $1', [policyId]);
      if (p.rows.length === 0) throw new DecisionPolicyNotFoundError('DecisionPolicy', policyId);
      const nextVersion = (p.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_policy_versions
           (policy_id, tenant_id, workspace_id, business_id, version_number, specification, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [policyId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(specification)]
      );
      await client.query('UPDATE ai_decision_intelligence.decision_policies SET latest_version = $2 WHERE id = $1', [policyId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async recordEvaluation(ctx: TenantContext, policyVersionId: string, recommendationVersionId: string, businessId: string, passed: boolean, evaluatedValue?: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_policy_evaluations (policy_version_id, recommendation_version_id, tenant_id, workspace_id, business_id, passed, evaluated_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [policyVersionId, recommendationVersionId, ctx.tenantId, ctx.workspaceId, businessId, passed, evaluatedValue === undefined ? null : JSON.stringify(evaluatedValue)]
      );
    });
  }

  async recordGuardrailViolation(ctx: TenantContext, caseId: string, businessId: string, guardrailCode: string, severity: string, description: string, recommendationVersionId?: string): Promise<void> {
    if (!SEVERITIES.has(severity)) {
      throw new ValidationError('DecisionGuardrailViolation', [`unknown severity: ${severity}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_guardrail_violations (case_id, recommendation_version_id, tenant_id, workspace_id, business_id, guardrail_code, severity, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [caseId, recommendationVersionId ?? null, ctx.tenantId, ctx.workspaceId, businessId, guardrailCode, severity, description]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, policyId: string, toStatus: string): Promise<DecisionPolicy> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('DecisionPolicy', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_policies WHERE id = $1', [policyId]);
      if (current.rows.length === 0) throw new DecisionPolicyNotFoundError('DecisionPolicy', policyId);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_policies SET status = $2 WHERE id = $1 RETURNING *`,
        [policyId, toStatus]
      );
      return rowToPolicy(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DecisionPolicy> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_policies WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DecisionPolicyNotFoundError('DecisionPolicy', id);
      return rowToPolicy(result.rows[0]);
    });
  }

  async listActivePolicies(ctx: TenantContext, businessId: string): Promise<DecisionPolicy[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM ai_decision_intelligence.decision_policies WHERE business_id = $1 AND status = 'active' ORDER BY created_at`,
        [businessId]
      );
      return result.rows.map(rowToPolicy);
    });
  }
}
