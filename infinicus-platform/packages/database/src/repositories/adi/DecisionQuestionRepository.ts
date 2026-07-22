import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { DecisionQuestionNotFoundError, ValidationError } from './errors.js';

export interface DecisionQuestion {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  questionCode: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['draft', 'validated', 'active', 'superseded', 'retired'];
const OPERATORS = new Set(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']);

function rowToQuestion(row: Record<string, unknown>): DecisionQuestion {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    questionCode: row.question_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class DecisionQuestionRepository {
  async createQuestion(ctx: TenantContext, businessId: string, questionCode: string, statement: string): Promise<DecisionQuestion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_questions (tenant_id, workspace_id, business_id, question_code, statement)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, questionCode, statement]
      );
      return rowToQuestion(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, questionId: string, businessId: string, statement: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const q = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_questions WHERE id = $1', [questionId]);
      if (q.rows.length === 0) throw new DecisionQuestionNotFoundError('DecisionQuestion', questionId);
      const nextVersion = (q.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_question_versions
           (question_id, tenant_id, workspace_id, business_id, version_number, statement, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [questionId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, statement]
      );
      await client.query('UPDATE ai_decision_intelligence.decision_questions SET latest_version = $2 WHERE id = $1', [questionId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addObjective(ctx: TenantContext, questionVersionId: string, businessId: string, objectiveCode: string, description: string, weight?: number): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_objectives (question_version_id, tenant_id, workspace_id, business_id, objective_code, description, weight)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [questionVersionId, ctx.tenantId, ctx.workspaceId, businessId, objectiveCode, description, weight ?? null]
      );
    });
  }

  async addConstraint(ctx: TenantContext, questionVersionId: string, businessId: string, constraintCode: string, operator: string, operand: unknown): Promise<void> {
    if (!OPERATORS.has(operator)) {
      throw new ValidationError('DecisionConstraint', [`unknown operator: ${operator}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_constraints (question_version_id, tenant_id, workspace_id, business_id, constraint_code, operator, operand)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [questionVersionId, ctx.tenantId, ctx.workspaceId, businessId, constraintCode, operator, JSON.stringify(operand)]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, questionId: string, toStatus: string): Promise<DecisionQuestion> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('DecisionQuestion', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_questions WHERE id = $1', [questionId]);
      if (current.rows.length === 0) throw new DecisionQuestionNotFoundError('DecisionQuestion', questionId);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_questions SET status = $2 WHERE id = $1 RETURNING *`,
        [questionId, toStatus]
      );
      return rowToQuestion(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DecisionQuestion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_questions WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DecisionQuestionNotFoundError('DecisionQuestion', id);
      return rowToQuestion(result.rows[0]);
    });
  }
}
