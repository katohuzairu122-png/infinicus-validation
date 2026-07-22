import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { SimulationRiskValidationError } from './errors.js';

export interface SimulationRiskResult {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  runId: string;
  survivalRate: number;
  downsideP10: number;
  basis: string;
}

export interface SimulationFailureMode {
  id: string;
  runId: string;
  failureCode: string;
  description: string;
  likelihood: number | null;
}

function rowToRisk(row: Record<string, unknown>): SimulationRiskResult {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    runId: row.run_id as string,
    survivalRate: parseFloat(String(row.survival_rate)),
    downsideP10: parseFloat(String(row.downside_p10)),
    basis: row.basis as string,
  };
}

function rowToFailureMode(row: Record<string, unknown>): SimulationFailureMode {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    failureCode: row.failure_code as string,
    description: row.description as string,
    likelihood: row.likelihood === null ? null : parseFloat(String(row.likelihood)),
  };
}

export class SimulationRiskRepository {
  async recordRiskResult(ctx: TenantContext, businessId: string, runId: string, survivalRate: number, downsideP10: number, basis = 'final_cash'): Promise<SimulationRiskResult> {
    if (survivalRate < 0 || survivalRate > 1) {
      throw new SimulationRiskValidationError('SimulationRiskResult', [`survival_rate out of bounds: ${survivalRate}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_risk_results (tenant_id, workspace_id, business_id, run_id, survival_rate, downside_p10, basis)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, runId, survivalRate, downsideP10, basis]
      );
      return rowToRisk(result.rows[0]);
    });
  }

  async createFailureMode(ctx: TenantContext, businessId: string, runId: string, failureCode: string, description: string, likelihood?: number): Promise<SimulationFailureMode> {
    if (likelihood !== undefined && (likelihood < 0 || likelihood > 1)) {
      throw new SimulationRiskValidationError('SimulationFailureMode', [`likelihood out of bounds: ${likelihood}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_failure_modes (tenant_id, workspace_id, business_id, run_id, failure_code, description, likelihood)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, runId, failureCode, description, likelihood ?? null]
      );
      return rowToFailureMode(result.rows[0]);
    });
  }

  async listForRun(ctx: TenantContext, runId: string): Promise<{ risks: SimulationRiskResult[]; failureModes: SimulationFailureMode[] }> {
    return withTenantTransaction(ctx, async (client) => {
      const risks = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_risk_results WHERE run_id = $1', [runId]);
      const failureModes = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_failure_modes WHERE run_id = $1', [runId]);
      return { risks: risks.rows.map(rowToRisk), failureModes: failureModes.rows.map(rowToFailureMode) };
    });
  }
}
