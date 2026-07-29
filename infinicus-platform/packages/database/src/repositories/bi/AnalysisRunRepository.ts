import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, InvalidTransitionError } from './errors.js';

export interface AnalysisRequest {
  id: string;
  businessId: string;
  requestCode: string;
  domain: string;
  analysisType: string;
  status: string;
}

export interface AnalysisRun {
  id: string;
  analysisRequestId: string;
  businessId: string;
  componentReference: string;
  status: string;
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  correlationId: string;
}

export interface CreateAnalysisRequestInput {
  businessId: string;
  requestCode: string;
  domain: string;
  analysisType: string;
  datasetVersionId?: string;
  requestedBy?: string;
}

const RUN_TRANSITIONS: Record<string, string[]> = {
  queued: ['running', 'cancelled'],
  running: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

function rowToRequest(row: Record<string, unknown>): AnalysisRequest {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    requestCode: row.request_code as string,
    domain: row.domain as string,
    analysisType: row.analysis_type as string,
    status: row.status as string,
  };
}

function rowToRun(row: Record<string, unknown>): AnalysisRun {
  return {
    id: row.id as string,
    analysisRequestId: row.analysis_request_id as string,
    businessId: row.business_id as string,
    componentReference: row.component_reference as string,
    status: row.status as string,
    failureCode: row.failure_code as string | null,
    failureMessage: row.failure_message as string | null,
    startedAt: row.started_at as Date | null,
    completedAt: row.completed_at as Date | null,
    correlationId: row.correlation_id as string,
  };
}

export class AnalysisRunRepository {
  async createRequest(ctx: TenantContext, input: CreateAnalysisRequestInput): Promise<AnalysisRequest> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.analysis_requests
           (tenant_id, workspace_id, business_id, request_code, domain, analysis_type, dataset_version_id, requested_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, input.businessId, input.requestCode, input.domain, input.analysisType, input.datasetVersionId ?? null, input.requestedBy ?? null]
      );
      return rowToRequest(result.rows[0]);
    });
  }

  async createRun(ctx: TenantContext, analysisRequestId: string, businessId: string, componentReference: string): Promise<AnalysisRun> {
    return withTenantTransaction(ctx, async (client) => {
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.analysis_runs
           (analysis_request_id, tenant_id, workspace_id, business_id, component_reference, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [analysisRequestId, ctx.tenantId, ctx.workspaceId, businessId, componentReference, correlationId]
      );
      await client.query(
        `INSERT INTO business_intelligence.analysis_status_history
           (analysis_run_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,NULL,'queued',$5)`,
        [result.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, correlationId]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async findRunById(ctx: TenantContext, id: string): Promise<AnalysisRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.analysis_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('AnalysisRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async listRunsByRequest(ctx: TenantContext, analysisRequestId: string): Promise<AnalysisRun[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_intelligence.analysis_runs WHERE analysis_request_id = $1 ORDER BY created_at DESC', [analysisRequestId]
      );
      return result.rows.map(rowToRun);
    });
  }

  async transitionRun(ctx: TenantContext, id: string, toStatus: string, opts: { failureCode?: string; failureMessage?: string } = {}): Promise<AnalysisRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.analysis_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('AnalysisRun', id);
      const fromStatus = current.rows[0].status as string;
      if (!RUN_TRANSITIONS[fromStatus]?.includes(toStatus)) {
        throw new InvalidTransitionError('AnalysisRun', fromStatus, toStatus);
      }
      const isStart = toStatus === 'running';
      const isTerminal = ['completed', 'failed', 'cancelled'].includes(toStatus);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_intelligence.analysis_runs
         SET status = $2,
             failure_code = $3,
             failure_message = $4,
             started_at = CASE WHEN $5 THEN now() ELSE started_at END,
             completed_at = CASE WHEN $6 THEN now() ELSE completed_at END
         WHERE id = $1
         RETURNING *`,
        [id, toStatus, opts.failureCode ?? null, opts.failureMessage ?? null, isStart, isTerminal]
      );
      await client.query(
        `INSERT INTO business_intelligence.analysis_status_history
           (analysis_run_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, result.rows[0].correlation_id]
      );
      return rowToRun(result.rows[0]);
    });
  }
}
