import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, TwinCalibrationStateConflictError } from './errors.js';

export interface TwinCalibrationRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  instanceId: string;
  status: string;
  requestedBy: string | null;
  correlationId: string;
}

function rowToRun(row: Record<string, unknown>): TwinCalibrationRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    instanceId: row.instance_id as string,
    status: row.status as string,
    requestedBy: row.requested_by as string | null,
    correlationId: row.correlation_id as string,
  };
}

export class TwinCalibrationRepository {
  async createRun(ctx: TenantContext, businessId: string, instanceId: string, requestedBy?: string): Promise<TwinCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_calibration_runs (tenant_id, workspace_id, business_id, instance_id, requested_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, instanceId, requestedBy ?? null]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async addInput(ctx: TenantContext, calibrationRunId: string, businessId: string, inputReference: Record<string, unknown>, stateVariableDefinitionId?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_digital_twin.twin_calibration_inputs
           (calibration_run_id, tenant_id, workspace_id, business_id, state_variable_definition_id, input_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [calibrationRunId, ctx.tenantId, ctx.workspaceId, businessId, stateVariableDefinitionId ?? null, JSON.stringify(inputReference)]
      );
    });
  }

  async startRun(ctx: TenantContext, id: string): Promise<TwinCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_calibration_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('TwinCalibrationRun', id);
      if (current.rows[0].status !== 'requested') throw new TwinCalibrationStateConflictError('TwinCalibrationRun', 'must be requested before starting');
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.twin_calibration_runs SET status = 'running', started_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async completeRun(ctx: TenantContext, id: string, businessId: string, results: readonly { stateVariableDefinitionId?: string; adjustedValue: unknown; delta?: number }[]): Promise<TwinCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_calibration_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('TwinCalibrationRun', id);
      if (current.rows[0].status !== 'running') throw new TwinCalibrationStateConflictError('TwinCalibrationRun', 'must be running before completion');
      for (const r of results) {
        await client.query(
          `INSERT INTO business_digital_twin.twin_calibration_results
             (calibration_run_id, tenant_id, workspace_id, business_id, state_variable_definition_id, adjusted_value, delta)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [id, ctx.tenantId, ctx.workspaceId, businessId, r.stateVariableDefinitionId ?? null, JSON.stringify(r.adjustedValue), r.delta ?? null]
        );
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.twin_calibration_runs SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async failRun(ctx: TenantContext, id: string): Promise<TwinCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_calibration_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('TwinCalibrationRun', id);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.twin_calibration_runs SET status = 'failed', completed_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async getRun(ctx: TenantContext, id: string): Promise<TwinCalibrationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_calibration_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('TwinCalibrationRun', id);
      return rowToRun(result.rows[0]);
    });
  }
}
