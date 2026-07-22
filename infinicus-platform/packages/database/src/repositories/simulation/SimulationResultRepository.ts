import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { SimulationResultNotFoundError, SimulationResultStateConflictError, SimulationResultImmutableError } from './errors.js';

export interface SimulationResult {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  runId: string;
  resultCode: string;
  status: string;
  latestVersion: number;
}

export interface SimulationResultVersion {
  id: string;
  resultId: string;
  versionNumber: number;
  summary: string;
  status: string;
  correlationId: string;
}

function rowToResult(row: Record<string, unknown>): SimulationResult {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    runId: row.run_id as string,
    resultCode: row.result_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToVersion(row: Record<string, unknown>): SimulationResultVersion {
  return {
    id: row.id as string,
    resultId: row.result_id as string,
    versionNumber: row.version_number as number,
    summary: row.summary as string,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class SimulationResultRepository {
  async createResult(ctx: TenantContext, businessId: string, runId: string, resultCode: string, summary: string): Promise<{ result: SimulationResult; version: SimulationResultVersion }> {
    return withTenantTransaction(ctx, async (client) => {
      const resultRow = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_results (tenant_id, workspace_id, business_id, run_id, result_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, runId, resultCode]
      );
      const correlationId = randomUUID();
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_result_versions (result_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING *`,
        [resultRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, summary, correlationId]
      );
      return { result: rowToResult(resultRow.rows[0]), version: rowToVersion(versionResult.rows[0]) };
    });
  }

  async addMetric(ctx: TenantContext, resultVersionId: string, metricCode: string, valueJson: unknown, unit?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_result_metrics (result_version_id, tenant_id, workspace_id, business_id, metric_code, value_json, unit)
         VALUES ($1,$2,$3,(SELECT business_id FROM simulation.simulation_result_versions WHERE id = $1),$4,$5,$6)`,
        [resultVersionId, ctx.tenantId, ctx.workspaceId, metricCode, JSON.stringify(valueJson), unit ?? null]
      );
    });
  }

  async addEvidence(ctx: TenantContext, resultVersionId: string, evidenceType: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_result_evidence (result_version_id, tenant_id, workspace_id, business_id, evidence_type, evidence_reference)
         VALUES ($1,$2,$3,(SELECT business_id FROM simulation.simulation_result_versions WHERE id = $1),$4,$5)`,
        [resultVersionId, ctx.tenantId, ctx.workspaceId, evidenceType, JSON.stringify(evidenceReference)]
      );
    });
  }

  async validateResult(ctx: TenantContext, resultId: string, resultVersionId: string): Promise<SimulationResult> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_results WHERE id = $1', [resultId]);
      if (current.rows.length === 0) throw new SimulationResultNotFoundError('SimulationResult', resultId);
      if (current.rows[0].status === 'published') throw new SimulationResultImmutableError('SimulationResult', 'published results cannot be revalidated');
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_results SET status = 'validated' WHERE id = $1 RETURNING *`,
        [resultId]
      );
      await client.query(`UPDATE simulation.simulation_result_versions SET status = 'validated' WHERE id = $1`, [resultVersionId]);
      return rowToResult(result.rows[0]);
    });
  }

  async publishResult(ctx: TenantContext, resultId: string, resultVersionId: string): Promise<SimulationResult> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_results WHERE id = $1', [resultId]);
      if (current.rows.length === 0) throw new SimulationResultNotFoundError('SimulationResult', resultId);
      if (current.rows[0].status !== 'validated') {
        throw new SimulationResultStateConflictError('SimulationResult', 'must be validated before publication');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_results SET status = 'published' WHERE id = $1 RETURNING *`,
        [resultId]
      );
      await client.query(`UPDATE simulation.simulation_result_versions SET status = 'published' WHERE id = $1`, [resultVersionId]);
      return rowToResult(result.rows[0]);
    });
  }

  /** Only legal before publication — published results are immutable (enforced by the database trigger). */
  async supersedeResult(ctx: TenantContext, resultId: string): Promise<SimulationResult> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_results WHERE id = $1', [resultId]);
      if (current.rows.length === 0) throw new SimulationResultNotFoundError('SimulationResult', resultId);
      if (current.rows[0].status === 'published') {
        throw new SimulationResultImmutableError('SimulationResult', 'published results cannot be superseded in place');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_results SET status = 'superseded' WHERE id = $1 RETURNING *`,
        [resultId]
      );
      return rowToResult(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<SimulationResult> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_results WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new SimulationResultNotFoundError('SimulationResult', id);
      return rowToResult(result.rows[0]);
    });
  }

  async getPublishedForRun(ctx: TenantContext, runId: string): Promise<SimulationResult[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM simulation.simulation_results WHERE run_id = $1 AND status = 'published' ORDER BY created_at DESC`,
        [runId]
      );
      return result.rows.map(rowToResult);
    });
  }
}
