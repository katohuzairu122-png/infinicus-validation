import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { LearningCaseNotFoundError, LearningCaseStateConflictError } from './errors.js';

export interface LearningCase {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  intakePackageId: string;
  caseCode: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['active', 'completed', 'cancelled'];

function rowToCase(row: Record<string, unknown>): LearningCase {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    intakePackageId: row.intake_package_id as string,
    caseCode: row.case_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class LearningCaseRepository {
  async createCase(ctx: TenantContext, businessId: string, intakePackageId: string, caseCode: string, summary: string): Promise<{ case: LearningCase; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const caseRow = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_cases (tenant_id, workspace_id, business_id, intake_package_id, case_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, intakePackageId, caseCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.learning_case_versions (learning_case_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [caseRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, summary, randomUUID()]
      );
      return { case: rowToCase(caseRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addEvidence(ctx: TenantContext, learningCaseId: string, businessId: string, evidenceType: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.learning_case_evidence (learning_case_id, tenant_id, workspace_id, business_id, evidence_type, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [learningCaseId, ctx.tenantId, ctx.workspaceId, businessId, evidenceType, JSON.stringify(evidenceReference)]
      );
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, reason?: string): Promise<LearningCase> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new LearningCaseStateConflictError('LearningCase', `unknown status: ${toStatus}`);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.learning_cases WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new LearningCaseNotFoundError('LearningCase', id);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.learning_cases SET status = $2 WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      await client.query(
        `INSERT INTO continuous_learning.learning_case_status_history (learning_case_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,gen_random_uuid())`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null]
      );
      return rowToCase(result.rows[0]);
    });
  }

  async activate(ctx: TenantContext, id: string): Promise<LearningCase> {
    return this.transition(ctx, id, 'active');
  }

  async complete(ctx: TenantContext, id: string): Promise<LearningCase> {
    return this.transition(ctx, id, 'completed');
  }

  async cancel(ctx: TenantContext, id: string, reason: string): Promise<LearningCase> {
    return this.transition(ctx, id, 'cancelled', reason);
  }

  async getById(ctx: TenantContext, id: string): Promise<LearningCase> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.learning_cases WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new LearningCaseNotFoundError('LearningCase', id);
      return rowToCase(result.rows[0]);
    });
  }

  async listByIntakePackage(ctx: TenantContext, intakePackageId: string): Promise<LearningCase[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM continuous_learning.learning_cases WHERE intake_package_id = $1 ORDER BY created_at DESC',
        [intakePackageId]
      );
      return result.rows.map(rowToCase);
    });
  }
}
