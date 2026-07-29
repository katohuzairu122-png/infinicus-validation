import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { LearnedLessonNotFoundError } from './errors.js';

export interface LearnedLesson {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  learningCaseId: string;
  lessonCode: string;
  status: string;
  latestVersion: number;
}

function rowToLesson(row: Record<string, unknown>): LearnedLesson {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    learningCaseId: row.learning_case_id as string,
    lessonCode: row.lesson_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class LearnedLessonRepository {
  async createLesson(ctx: TenantContext, businessId: string, learningCaseId: string, lessonCode: string, statement: string): Promise<{ lesson: LearnedLesson; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const lessonRow = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learned_lessons (tenant_id, workspace_id, business_id, learning_case_id, lesson_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, learningCaseId, lessonCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learned_lesson_versions (lesson_id, tenant_id, workspace_id, business_id, version_number, statement, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [lessonRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, statement, randomUUID()]
      );
      return { lesson: rowToLesson(lessonRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addEvidence(ctx: TenantContext, lessonVersionId: string, businessId: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.lesson_evidence (lesson_version_id, tenant_id, workspace_id, business_id, evidence_reference)
         VALUES ($1,$2,$3,$4,$5)`,
        [lessonVersionId, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(evidenceReference)]
      );
    });
  }

  async addApplicability(ctx: TenantContext, lessonVersionId: string, businessId: string, scopeType: string, scopeValue: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.lesson_applicability (lesson_version_id, tenant_id, workspace_id, business_id, scope_type, scope_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [lessonVersionId, ctx.tenantId, ctx.workspaceId, businessId, scopeType, JSON.stringify(scopeValue)]
      );
    });
  }

  async validate(ctx: TenantContext, id: string): Promise<LearnedLesson> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learned_lessons SET status = 'validated' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearnedLessonNotFoundError('LearnedLesson', id);
      return rowToLesson(result.rows[0]);
    });
  }

  async publish(ctx: TenantContext, id: string): Promise<LearnedLesson> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learned_lessons SET status = 'published' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearnedLessonNotFoundError('LearnedLesson', id);
      return rowToLesson(result.rows[0]);
    });
  }

  async retire(ctx: TenantContext, id: string): Promise<LearnedLesson> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learned_lessons SET status = 'retired' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new LearnedLessonNotFoundError('LearnedLesson', id);
      return rowToLesson(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<LearnedLesson> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.learned_lessons WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new LearnedLessonNotFoundError('LearnedLesson', id);
      return rowToLesson(result.rows[0]);
    });
  }

  async listByCase(ctx: TenantContext, learningCaseId: string): Promise<LearnedLesson[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM continuous_learning.learned_lessons WHERE learning_case_id = $1 ORDER BY created_at DESC',
        [learningCaseId]
      );
      return result.rows.map(rowToLesson);
    });
  }
}
