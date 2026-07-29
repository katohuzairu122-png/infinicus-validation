import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ValidationError } from './errors.js';

export interface DecisionConfidenceScore {
  id: string;
  recommendationVersionId: string;
  confidence: number;
  basis: string;
}

const IMPACTS = new Set(['low', 'medium', 'high']);
const ASSUMPTION_SOURCES = new Set(['observed', 'declared', 'derived', 'inferred', 'external']);

function rowToScore(row: Record<string, unknown>): DecisionConfidenceScore {
  return {
    id: row.id as string,
    recommendationVersionId: row.recommendation_version_id as string,
    confidence: Number(row.confidence),
    basis: row.basis as string,
  };
}

export class DecisionConfidenceRepository {
  async recordConfidenceScore(ctx: TenantContext, recommendationVersionId: string, businessId: string, confidence: number, basis: string): Promise<DecisionConfidenceScore> {
    if (confidence < 0 || confidence > 1) {
      throw new ValidationError('DecisionConfidenceScore', ['confidence must be between 0 and 1']);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_confidence_scores (recommendation_version_id, tenant_id, workspace_id, business_id, confidence, basis)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [recommendationVersionId, ctx.tenantId, ctx.workspaceId, businessId, confidence, basis]
      );
      return rowToScore(result.rows[0]);
    });
  }

  async recordUncertainty(ctx: TenantContext, recommendationVersionId: string, businessId: string, uncertaintyCode: string, description: string, impact: string): Promise<void> {
    if (!IMPACTS.has(impact)) {
      throw new ValidationError('DecisionUncertainty', [`unknown impact: ${impact}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_uncertainties (recommendation_version_id, tenant_id, workspace_id, business_id, uncertainty_code, description, impact)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [recommendationVersionId, ctx.tenantId, ctx.workspaceId, businessId, uncertaintyCode, description, impact]
      );
    });
  }

  async recordLimitation(ctx: TenantContext, recommendationVersionId: string, businessId: string, limitationCode: string, description: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_limitations (recommendation_version_id, tenant_id, workspace_id, business_id, limitation_code, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [recommendationVersionId, ctx.tenantId, ctx.workspaceId, businessId, limitationCode, description]
      );
    });
  }

  async recordAssumption(ctx: TenantContext, recommendationVersionId: string, businessId: string, assumptionCode: string, statement: string, source: string): Promise<void> {
    if (!ASSUMPTION_SOURCES.has(source)) {
      throw new ValidationError('DecisionAssumption', [`unknown source: ${source}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_assumptions (recommendation_version_id, tenant_id, workspace_id, business_id, assumption_code, statement, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [recommendationVersionId, ctx.tenantId, ctx.workspaceId, businessId, assumptionCode, statement, source]
      );
    });
  }

  async listForRecommendationVersion(ctx: TenantContext, recommendationVersionId: string): Promise<DecisionConfidenceScore[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM ai_decision_intelligence.decision_confidence_scores WHERE recommendation_version_id = $1 ORDER BY created_at',
        [recommendationVersionId]
      );
      return result.rows.map(rowToScore);
    });
  }
}
