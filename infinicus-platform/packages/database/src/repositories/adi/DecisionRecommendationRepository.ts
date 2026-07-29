import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import {
  DecisionRecommendationNotFoundError,
  DecisionRecommendationStateConflictError,
  DecisionRecommendationImmutableError,
} from './errors.js';

export interface DecisionRecommendation {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  caseId: string;
  chosenAlternativeId: string | null;
  recommendationCode: string;
  status: string;
  latestVersion: number;
}

export interface DecisionRecommendationVersion {
  id: string;
  recommendationId: string;
  versionNumber: number;
  summary: string;
  status: string;
  correlationId: string;
}

function rowToRecommendation(row: Record<string, unknown>): DecisionRecommendation {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    caseId: row.case_id as string,
    chosenAlternativeId: row.chosen_alternative_id as string | null,
    recommendationCode: row.recommendation_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToVersion(row: Record<string, unknown>): DecisionRecommendationVersion {
  return {
    id: row.id as string,
    recommendationId: row.recommendation_id as string,
    versionNumber: row.version_number as number,
    summary: row.summary as string,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class DecisionRecommendationRepository {
  async createRecommendation(ctx: TenantContext, businessId: string, caseId: string, recommendationCode: string, summary: string, chosenAlternativeId?: string): Promise<{ recommendation: DecisionRecommendation; version: DecisionRecommendationVersion }> {
    return withTenantTransaction(ctx, async (client) => {
      const recRow = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_recommendations (tenant_id, workspace_id, business_id, case_id, chosen_alternative_id, recommendation_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, caseId, chosenAlternativeId ?? null, recommendationCode]
      );
      const correlationId = randomUUID();
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_recommendation_versions (recommendation_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING *`,
        [recRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, summary, correlationId]
      );
      return { recommendation: rowToRecommendation(recRow.rows[0]), version: rowToVersion(versionResult.rows[0]) };
    });
  }

  async addRationale(ctx: TenantContext, recommendationVersionId: string, businessId: string, rationaleCode: string, statement: string, evidenceReference: Record<string, unknown> = {}): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.recommendation_rationales (recommendation_version_id, tenant_id, workspace_id, business_id, rationale_code, statement, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [recommendationVersionId, ctx.tenantId, ctx.workspaceId, businessId, rationaleCode, statement, JSON.stringify(evidenceReference)]
      );
    });
  }

  async addImplementationStep(ctx: TenantContext, recommendationVersionId: string, businessId: string, stepNumber: number, description: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.recommendation_implementation_steps (recommendation_version_id, tenant_id, workspace_id, business_id, step_number, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [recommendationVersionId, ctx.tenantId, ctx.workspaceId, businessId, stepNumber, description]
      );
    });
  }

  async validateRecommendation(ctx: TenantContext, recommendationId: string, recommendationVersionId: string): Promise<DecisionRecommendation> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_recommendations WHERE id = $1', [recommendationId]);
      if (current.rows.length === 0) throw new DecisionRecommendationNotFoundError('DecisionRecommendation', recommendationId);
      if (current.rows[0].status === 'published') {
        throw new DecisionRecommendationImmutableError('DecisionRecommendation', 'published recommendations cannot be revalidated');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_recommendations SET status = 'validated' WHERE id = $1 RETURNING *`,
        [recommendationId]
      );
      await client.query(`UPDATE ai_decision_intelligence.decision_recommendation_versions SET status = 'validated' WHERE id = $1`, [recommendationVersionId]);
      return rowToRecommendation(result.rows[0]);
    });
  }

  /** Publishing is the ADI/ABA authority boundary: this only marks the recommendation eligible for the ADI-to-ABA handoff. ADI never approves or executes it. */
  async publishRecommendation(ctx: TenantContext, recommendationId: string, recommendationVersionId: string): Promise<DecisionRecommendation> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_recommendations WHERE id = $1', [recommendationId]);
      if (current.rows.length === 0) throw new DecisionRecommendationNotFoundError('DecisionRecommendation', recommendationId);
      if (current.rows[0].status !== 'validated') {
        throw new DecisionRecommendationStateConflictError('DecisionRecommendation', 'must be validated before publication');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_recommendations SET status = 'published' WHERE id = $1 RETURNING *`,
        [recommendationId]
      );
      await client.query(`UPDATE ai_decision_intelligence.decision_recommendation_versions SET status = 'published' WHERE id = $1`, [recommendationVersionId]);
      return rowToRecommendation(result.rows[0]);
    });
  }

  async rejectRecommendation(ctx: TenantContext, recommendationId: string): Promise<DecisionRecommendation> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_recommendations WHERE id = $1', [recommendationId]);
      if (current.rows.length === 0) throw new DecisionRecommendationNotFoundError('DecisionRecommendation', recommendationId);
      if (current.rows[0].status === 'published') {
        throw new DecisionRecommendationImmutableError('DecisionRecommendation', 'published recommendations cannot be rejected in place');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_recommendations SET status = 'rejected' WHERE id = $1 RETURNING *`,
        [recommendationId]
      );
      return rowToRecommendation(result.rows[0]);
    });
  }

  /** Only legal before publication — published recommendations are immutable (enforced by the database trigger). */
  async supersedeRecommendation(ctx: TenantContext, recommendationId: string): Promise<DecisionRecommendation> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_recommendations WHERE id = $1', [recommendationId]);
      if (current.rows.length === 0) throw new DecisionRecommendationNotFoundError('DecisionRecommendation', recommendationId);
      if (current.rows[0].status === 'published') {
        throw new DecisionRecommendationImmutableError('DecisionRecommendation', 'published recommendations cannot be superseded in place');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_recommendations SET status = 'superseded' WHERE id = $1 RETURNING *`,
        [recommendationId]
      );
      return rowToRecommendation(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DecisionRecommendation> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_recommendations WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DecisionRecommendationNotFoundError('DecisionRecommendation', id);
      return rowToRecommendation(result.rows[0]);
    });
  }

  async getPublishedForCase(ctx: TenantContext, caseId: string): Promise<DecisionRecommendation[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM ai_decision_intelligence.decision_recommendations WHERE case_id = $1 AND status = 'published' ORDER BY created_at DESC`,
        [caseId]
      );
      return result.rows.map(rowToRecommendation);
    });
  }
}
