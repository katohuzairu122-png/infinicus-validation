import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, SimulationValidationStateConflictError, SimulationCalibrationStateConflictError, ValidationError } from './errors.js';

export interface SimulationValidationRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  modelVersionId: string;
  status: string;
  outcome: string | null;
  correlationId: string;
}

export interface SimulationCalibrationRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  modelVersionId: string;
  status: string;
  requestedBy: string | null;
  correlationId: string;
}

const VALID_OUTCOMES = ['passed', 'passed_with_warnings', 'failed'];

function rowToValidationRun(row: Record<string, unknown>): SimulationValidationRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    modelVersionId: row.model_version_id as string,
    status: row.status as string,
    outcome: row.outcome as string | null,
    correlationId: row.correlation_id as string,
  };
}

function rowToCalibrationRun(row: Record<string, unknown>): SimulationCalibrationRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    modelVersionId: row.model_version_id as string,
    status: row.status as string,
    requestedBy: row.requested_by as string | null,
    correlationId: row.correlation_id as string,
  };
}

export class SimulationValidationRepository {
  async createRun(ctx: TenantContext, businessId: string, modelVersionId: string): Promise<SimulationValidationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_validation_runs (tenant_id, workspace_id, business_id, model_version_id, status, started_at)
         VALUES ($1,$2,$3,$4,'running',now()) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, modelVersionId]
      );
      return rowToValidationRun(result.rows[0]);
    });
  }

  async recordResult(ctx: TenantContext, validationRunId: string, businessId: string, outcome: string, summary: string): Promise<void> {
    if (!VALID_OUTCOMES.includes(outcome)) throw new ValidationError('SimulationValidationResult', [`unknown outcome: ${outcome}`]);
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_validation_results (validation_run_id, tenant_id, workspace_id, business_id, outcome, summary)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [validationRunId, ctx.tenantId, ctx.workspaceId, businessId, outcome, summary]
      );
    });
  }

  async completeRun(ctx: TenantContext, id: string, outcome: string): Promise<SimulationValidationRun> {
    if (!VALID_OUTCOMES.includes(outcome)) throw new ValidationError('SimulationValidationRun', [`unknown outcome: ${outcome}`]);
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_validation_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('SimulationValidationRun', id);
      if (current.rows[0].status !== 'running') throw new SimulationValidationStateConflictError('SimulationValidationRun', 'must be running before completion');
      const status = outcome === 'failed' ? 'failed' : 'completed';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_validation_runs SET status = $2, outcome = $3, completed_at = now() WHERE id = $1 RETURNING *`,
        [id, status, outcome]
      );
      return rowToValidationRun(result.rows[0]);
    });
  }

  async getRun(ctx: TenantContext, id: string): Promise<SimulationValidationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_validation_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('SimulationValidationRun', id);
      return rowToValidationRun(result.rows[0]);
    });
  }

  async createCalibrationRun(ctx: TenantContext, businessId: string, modelVersionId: string, requestedBy?: string): Promise<SimulationCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_calibration_runs (tenant_id, workspace_id, business_id, model_version_id, requested_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, modelVersionId, requestedBy ?? null]
      );
      return rowToCalibrationRun(result.rows[0]);
    });
  }

  async startCalibrationRun(ctx: TenantContext, id: string): Promise<SimulationCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_calibration_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('SimulationCalibrationRun', id);
      if (current.rows[0].status !== 'requested') throw new SimulationCalibrationStateConflictError('SimulationCalibrationRun', 'must be requested before starting');
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_calibration_runs SET status = 'running', started_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return rowToCalibrationRun(result.rows[0]);
    });
  }

  async completeCalibrationRun(ctx: TenantContext, id: string, businessId: string, results: readonly { parameterCode: string; adjustedValue: unknown; delta?: number }[]): Promise<SimulationCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_calibration_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('SimulationCalibrationRun', id);
      if (current.rows[0].status !== 'running') throw new SimulationCalibrationStateConflictError('SimulationCalibrationRun', 'must be running before completion');
      for (const r of results) {
        await client.query(
          `INSERT INTO simulation.simulation_calibration_results (calibration_run_id, tenant_id, workspace_id, business_id, parameter_code, adjusted_value, delta)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, ctx.tenantId, ctx.workspaceId, businessId, r.parameterCode, JSON.stringify(r.adjustedValue), r.delta ?? null]
        );
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_calibration_runs SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return rowToCalibrationRun(result.rows[0]);
    });
  }

  async getCalibrationRun(ctx: TenantContext, id: string): Promise<SimulationCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_calibration_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('SimulationCalibrationRun', id);
      return rowToCalibrationRun(result.rows[0]);
    });
  }
}
