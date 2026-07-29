import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { LearningPatternNotFoundError } from './errors.js';

export interface LearningPattern {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  learningCaseId: string;
  patternCode: string;
  status: string;
  latestVersion: number;
}

function rowToPattern(row: Record<string, unknown>): LearningPattern {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    learningCaseId: row.learning_case_id as string,
    patternCode: row.pattern_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class LearningPatternRepository {
  async createPattern(ctx: TenantContext, businessId: string, learningCaseId: string, patternCode: string, description: string): Promise<{ pattern: LearningPattern; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const patternRow = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_patterns (tenant_id, workspace_id, business_id, learning_case_id, pattern_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, learningCaseId, patternCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_pattern_versions (pattern_id, tenant_id, workspace_id, business_id, version_number, description, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [patternRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, description, randomUUID()]
      );
      return { pattern: rowToPattern(patternRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addObservation(ctx: TenantContext, patternVersionId: string, businessId: string, detail: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.pattern_observations (pattern_version_id, tenant_id, workspace_id, business_id, detail)
         VALUES ($1,$2,$3,$4,$5)`,
        [patternVersionId, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(detail)]
      );
    });
  }

  async addConfidenceScore(ctx: TenantContext, patternVersionId: string, businessId: string, confidence: number): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.pattern_confidence_scores (pattern_version_id, tenant_id, workspace_id, business_id, confidence)
         VALUES ($1,$2,$3,$4,$5)`,
        [patternVersionId, ctx.tenantId, ctx.workspaceId, businessId, confidence]
      );
    });
  }

  async confirm(ctx: TenantContext, id: string): Promise<LearningPattern> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learning_patterns SET status = 'confirmed' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearningPatternNotFoundError('LearningPattern', id);
      return rowToPattern(result.rows[0]);
    });
  }

  async retire(ctx: TenantContext, id: string): Promise<LearningPattern> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learning_patterns SET status = 'retired' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearningPatternNotFoundError('LearningPattern', id);
      return rowToPattern(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<LearningPattern> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.learning_patterns WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new LearningPatternNotFoundError('LearningPattern', id);
      return rowToPattern(result.rows[0]);
    });
  }

  async listByCase(ctx: TenantContext, learningCaseId: string): Promise<LearningPattern[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM continuous_learning.learning_patterns WHERE learning_case_id = $1 ORDER BY created_at DESC',
        [learningCaseId]
      );
      return result.rows.map(rowToPattern);
    });
  }
}
