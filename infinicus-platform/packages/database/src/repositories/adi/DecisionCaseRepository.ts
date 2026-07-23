import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { DecisionCaseNotFoundError, ValidationError } from './errors.js';

export interface DecisionCase {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  questionId: string;
  intakePackageId: string | null;
  caseCode: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['open', 'reasoning', 'evidence_gathered', 'alternatives_generated', 'recommended', 'closed', 'cancelled'];

function rowToCase(row: Record<string, unknown>): DecisionCase {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    questionId: row.question_id as string,
    intakePackageId: row.intake_package_id as string | null,
    caseCode: row.case_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class DecisionCaseRepository {
  async createCase(ctx: TenantContext, businessId: string, questionId: string, caseCode: string, intakePackageId?: string): Promise<DecisionCase> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_cases (tenant_id, workspace_id, business_id, question_id, intake_package_id, case_code)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, questionId, intakePackageId ?? null, caseCode]
      );
      return rowToCase(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, caseId: string, businessId: string, summary: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const c = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_cases WHERE id = $1', [caseId]);
      if (c.rows.length === 0) throw new DecisionCaseNotFoundError('DecisionCase', caseId);
      const nextVersion = (c.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_case_versions
           (case_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [caseId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, summary]
      );
      await client.query('UPDATE ai_decision_intelligence.decision_cases SET latest_version = $2 WHERE id = $1', [caseId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addInput(ctx: TenantContext, caseVersionId: string, businessId: string, inputType: string, inputReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_case_inputs (case_version_id, tenant_id, workspace_id, business_id, input_type, input_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [caseVersionId, ctx.tenantId, ctx.workspaceId, businessId, inputType, JSON.stringify(inputReference)]
      );
    });
  }

  async transitionStatus(ctx: TenantContext, caseId: string, toStatus: string, reason?: string): Promise<DecisionCase> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('DecisionCase', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_cases WHERE id = $1', [caseId]);
      if (current.rows.length === 0) throw new DecisionCaseNotFoundError('DecisionCase', caseId);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.decision_cases SET status = $2 WHERE id = $1 RETURNING *`,
        [caseId, toStatus]
      );
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_case_status_history
           (case_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [caseId, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null, randomUUID()]
      );
      return rowToCase(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DecisionCase> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_cases WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DecisionCaseNotFoundError('DecisionCase', id);
      return rowToCase(result.rows[0]);
    });
  }

  async listForBusiness(ctx: TenantContext, businessId: string): Promise<DecisionCase[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM ai_decision_intelligence.decision_cases WHERE business_id = $1 ORDER BY created_at DESC', [businessId]
      );
      return result.rows.map(rowToCase);
    });
  }
}
