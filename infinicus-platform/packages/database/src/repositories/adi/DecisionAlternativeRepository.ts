import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { DecisionAlternativeNotFoundError, ValidationError } from './errors.js';

export interface DecisionAlternative {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  caseId: string;
  alternativeCode: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['draft', 'validated', 'active', 'superseded', 'retired'];
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function rowToAlternative(row: Record<string, unknown>): DecisionAlternative {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    caseId: row.case_id as string,
    alternativeCode: row.alternative_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class DecisionAlternativeRepository {
  async createAlternative(ctx: TenantContext, businessId: string, caseId: string, alternativeCode: string): Promise<DecisionAlternative> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_alternatives (tenant_id, workspace_id, business_id, case_id, alternative_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, caseId, alternativeCode]
      );
      return rowToAlternative(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, alternativeId: string, businessId: string, description: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const a = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_alternatives WHERE id = $1', [alternativeId]);
      if (a.rows.length === 0) throw new DecisionAlternativeNotFoundError('DecisionAlternative', alternativeId);
      const nextVersion = (a.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_alternative_versions
           (alternative_id, tenant_id, workspace_id, business_id, version_number, description, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [alternativeId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, description]
      );
      await client.query('UPDATE ai_decision_intelligence.decision_alternatives SET latest_version = $2 WHERE id = $1', [alternativeId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addOutcomeEstimate(ctx: TenantContext, alternativeVersionId: string, businessId: string, metricCode: string, estimatedValue: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.alternative_outcome_estimates (alternative_version_id, tenant_id, workspace_id, business_id, metric_code, estimated_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [alternativeVersionId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, JSON.stringify(estimatedValue)]
      );
    });
  }

  async addRiskProfile(ctx: TenantContext, alternativeVersionId: string, businessId: string, riskCode: string, severity: string, likelihood: number | undefined, description: string): Promise<void> {
    if (!SEVERITIES.has(severity)) {
      throw new ValidationError('AlternativeRiskProfile', [`unknown severity: ${severity}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.alternative_risk_profiles (alternative_version_id, tenant_id, workspace_id, business_id, risk_code, severity, likelihood, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [alternativeVersionId, ctx.tenantId, ctx.workspaceId, businessId, riskCode, severity, likelihood ?? null, description]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, alternativeId: string, toStatus: string): Promise<DecisionAlternative> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('DecisionAlternative', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_alternatives WHERE id = $1', [alternativeId]);
      if (current.rows.length === 0) throw new DecisionAlternativeNotFoundError('DecisionAlternative', alternativeId);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_alternatives SET status = $2 WHERE id = $1 RETURNING *`,
        [alternativeId, toStatus]
      );
      return rowToAlternative(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DecisionAlternative> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_alternatives WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DecisionAlternativeNotFoundError('DecisionAlternative', id);
      return rowToAlternative(result.rows[0]);
    });
  }

  async listByCase(ctx: TenantContext, caseId: string): Promise<DecisionAlternative[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM ai_decision_intelligence.decision_alternatives WHERE case_id = $1 ORDER BY created_at', [caseId]
      );
      return result.rows.map(rowToAlternative);
    });
  }
}
