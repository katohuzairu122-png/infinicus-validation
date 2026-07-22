import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, TwinValidationStateConflictError, ValidationError } from './errors.js';

export interface TwinValidationRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  instanceId: string;
  snapshotVersionId: string | null;
  status: string;
  outcome: string | null;
  correlationId: string;
}

const VALID_OUTCOMES = ['passed', 'passed_with_warnings', 'failed'];

function rowToRun(row: Record<string, unknown>): TwinValidationRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    instanceId: row.instance_id as string,
    snapshotVersionId: row.snapshot_version_id as string | null,
    status: row.status as string,
    outcome: row.outcome as string | null,
    correlationId: row.correlation_id as string,
  };
}

export class TwinValidationRepository {
  async createRun(ctx: TenantContext, businessId: string, instanceId: string, snapshotVersionId?: string): Promise<TwinValidationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_validation_runs (tenant_id, workspace_id, business_id, instance_id, snapshot_version_id, status, started_at)
         VALUES ($1,$2,$3,$4,$5,'running',now()) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, instanceId, snapshotVersionId ?? null]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async recordResult(ctx: TenantContext, validationRunId: string, businessId: string, outcome: string, summary: string): Promise<void> {
    if (!VALID_OUTCOMES.includes(outcome)) throw new ValidationError('TwinValidationResult', [`unknown outcome: ${outcome}`]);
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_digital_twin.twin_validation_results (validation_run_id, tenant_id, workspace_id, business_id, outcome, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [validationRunId, ctx.tenantId, ctx.workspaceId, businessId, outcome, summary]
      );
    });
  }

  async recordIssue(ctx: TenantContext, validationRunId: string, businessId: string, severity: 'info' | 'warning' | 'error', issueCode: string, message: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_digital_twin.twin_validation_issues (validation_run_id, tenant_id, workspace_id, business_id, severity, issue_code, message)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [validationRunId, ctx.tenantId, ctx.workspaceId, businessId, severity, issueCode, message]
      );
    });
  }

  async completeRun(ctx: TenantContext, id: string, outcome: string): Promise<TwinValidationRun> {
    if (!VALID_OUTCOMES.includes(outcome)) throw new ValidationError('TwinValidationRun', [`unknown outcome: ${outcome}`]);
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_validation_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('TwinValidationRun', id);
      if (current.rows[0].status !== 'running') throw new TwinValidationStateConflictError('TwinValidationRun', 'must be running before completion');
      const status = outcome === 'failed' ? 'failed' : 'completed';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.twin_validation_runs SET status = $2, outcome = $3, completed_at = now() WHERE id = $1 RETURNING *`,
        [id, status, outcome]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async getRun(ctx: TenantContext, id: string): Promise<TwinValidationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_validation_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('TwinValidationRun', id);
      return rowToRun(result.rows[0]);
    });
  }
}
