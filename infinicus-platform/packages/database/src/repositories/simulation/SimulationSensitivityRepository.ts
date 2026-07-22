import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, SimulationSensitivityStateConflictError } from './errors.js';

export interface SimulationSensitivityRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  scenarioVersionId: string;
  status: string;
  correlationId: string;
}

export interface SimulationSensitivityResult {
  id: string;
  sensitivityRunId: string;
  driver: string;
  metricCode: string;
  delta: number;
}

function rowToRun(row: Record<string, unknown>): SimulationSensitivityRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    scenarioVersionId: row.scenario_version_id as string,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

function rowToResult(row: Record<string, unknown>): SimulationSensitivityResult {
  return {
    id: row.id as string,
    sensitivityRunId: row.sensitivity_run_id as string,
    driver: row.driver as string,
    metricCode: row.metric_code as string,
    delta: parseFloat(String(row.delta)),
  };
}

export class SimulationSensitivityRepository {
  async createRun(ctx: TenantContext, businessId: string, scenarioVersionId: string): Promise<SimulationSensitivityRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_sensitivity_runs (tenant_id, workspace_id, business_id, scenario_version_id)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, scenarioVersionId]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async startRun(ctx: TenantContext, id: string): Promise<SimulationSensitivityRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_sensitivity_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('SimulationSensitivityRun', id);
      if (current.rows[0].status !== 'requested') throw new SimulationSensitivityStateConflictError('SimulationSensitivityRun', 'must be requested before starting');
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_sensitivity_runs SET status = 'running', started_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async recordResult(ctx: TenantContext, sensitivityRunId: string, businessId: string, driver: string, metricCode: string, delta: number): Promise<SimulationSensitivityResult> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_sensitivity_results (sensitivity_run_id, tenant_id, workspace_id, business_id, driver, metric_code, delta)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [sensitivityRunId, ctx.tenantId, ctx.workspaceId, businessId, driver, metricCode, delta]
      );
      return rowToResult(result.rows[0]);
    });
  }

  async completeRun(ctx: TenantContext, id: string): Promise<SimulationSensitivityRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_sensitivity_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('SimulationSensitivityRun', id);
      if (current.rows[0].status !== 'running') throw new SimulationSensitivityStateConflictError('SimulationSensitivityRun', 'must be running before completion');
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_sensitivity_runs SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async failRun(ctx: TenantContext, id: string): Promise<SimulationSensitivityRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_sensitivity_runs SET status = 'failed', completed_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('SimulationSensitivityRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async getRun(ctx: TenantContext, id: string): Promise<SimulationSensitivityRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_sensitivity_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('SimulationSensitivityRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async listResults(ctx: TenantContext, sensitivityRunId: string): Promise<SimulationSensitivityResult[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM simulation.simulation_sensitivity_results WHERE sensitivity_run_id = $1', [sensitivityRunId]
      );
      return result.rows.map(rowToResult);
    });
  }
}
