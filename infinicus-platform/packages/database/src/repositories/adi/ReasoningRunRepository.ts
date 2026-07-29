import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ReasoningRunNotFoundError, InvalidTransitionError, ValidationError } from './errors.js';

export interface ReasoningRequest {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  caseId: string;
  requestCode: string;
  idempotencyKey: string;
}

export interface ReasoningRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  requestId: string;
  caseId: string;
  status: string;
  failureCode: string | null;
  failureMessage: string | null;
}

const TRANSITIONS: Record<string, readonly string[]> = {
  queued: ['running', 'cancelled'],
  running: ['completed', 'failed', 'cancelled'],
};

const STEP_TYPES = new Set(['evidence_review', 'alternative_generation', 'risk_assessment', 'confidence_calculation', 'policy_evaluation', 'other']);

function rowToRequest(row: Record<string, unknown>): ReasoningRequest {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    caseId: row.case_id as string,
    requestCode: row.request_code as string,
    idempotencyKey: row.idempotency_key as string,
  };
}

function rowToRun(row: Record<string, unknown>): ReasoningRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    requestId: row.request_id as string,
    caseId: row.case_id as string,
    status: row.status as string,
    failureCode: row.failure_code as string | null,
    failureMessage: row.failure_message as string | null,
  };
}

export class ReasoningRunRepository {
  async createRequest(ctx: TenantContext, businessId: string, caseId: string, requestCode: string, idempotencyKey: string): Promise<{ request: ReasoningRequest; idempotentReplay: boolean }> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT * FROM ai_decision_intelligence.reasoning_requests WHERE business_id = $1 AND idempotency_key = $2',
        [businessId, idempotencyKey]
      );
      if (existing.rows.length > 0) return { request: rowToRequest(existing.rows[0]), idempotentReplay: true };
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.reasoning_requests (tenant_id, workspace_id, business_id, case_id, request_code, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, caseId, requestCode, idempotencyKey]
      );
      return { request: rowToRequest(result.rows[0]), idempotentReplay: false };
    });
  }

  async createRun(ctx: TenantContext, businessId: string, requestId: string, caseId: string): Promise<ReasoningRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.reasoning_runs (tenant_id, workspace_id, business_id, request_id, case_id)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, requestId, caseId]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async recordStep(ctx: TenantContext, runId: string, businessId: string, stepNumber: number, stepType: string, summary: string): Promise<void> {
    if (!STEP_TYPES.has(stepType)) {
      throw new ValidationError('ReasoningRunStep', [`unknown step_type: ${stepType}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.reasoning_run_steps (reasoning_run_id, tenant_id, workspace_id, business_id, step_number, step_type, summary)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [runId, ctx.tenantId, ctx.workspaceId, businessId, stepNumber, stepType, summary]
      );
    });
  }

  async transitionRun(ctx: TenantContext, runId: string, toStatus: string, extra: { failureCode?: string; failureMessage?: string } = {}): Promise<ReasoningRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.reasoning_runs WHERE id = $1', [runId]);
      if (current.rows.length === 0) throw new ReasoningRunNotFoundError('ReasoningRun', runId);
      const fromStatus = current.rows[0].status as string;
      if (!(TRANSITIONS[fromStatus] ?? []).includes(toStatus)) {
        throw new InvalidTransitionError('ReasoningRun', fromStatus, toStatus);
      }
      const setClauses: string[] = ['status = $2'];
      const values: unknown[] = [runId, toStatus];
      let i = 3;
      if (toStatus === 'running') { setClauses.push('started_at = now()'); }
      if (['completed', 'failed', 'cancelled'].includes(toStatus)) { setClauses.push('completed_at = now()'); }
      if (extra.failureCode !== undefined) { setClauses.push(`failure_code = $${i}`); values.push(extra.failureCode); i += 1; }
      if (extra.failureMessage !== undefined) { setClauses.push(`failure_message = $${i}`); values.push(extra.failureMessage); }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.reasoning_runs SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );
      await client.query(
        `INSERT INTO ai_decision_intelligence.reasoning_run_status_history (reasoning_run_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [runId, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, randomUUID()]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async getRun(ctx: TenantContext, runId: string): Promise<ReasoningRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.reasoning_runs WHERE id = $1', [runId]);
      if (result.rows.length === 0) throw new ReasoningRunNotFoundError('ReasoningRun', runId);
      return rowToRun(result.rows[0]);
    });
  }

  async listRunsByRequest(ctx: TenantContext, requestId: string): Promise<ReasoningRun[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM ai_decision_intelligence.reasoning_runs WHERE request_id = $1 ORDER BY created_at', [requestId]
      );
      return result.rows.map(rowToRun);
    });
  }
}
