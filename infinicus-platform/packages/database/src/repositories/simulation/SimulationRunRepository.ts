import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { SimulationRunNotFoundError, InvalidTransitionError, ValidationError } from './errors.js';

export interface SimulationRequest {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  scenarioVersionId: string;
  requestCode: string;
  idempotencyKey: string;
}

export interface SimulationRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  requestId: string;
  modelVersionId: string;
  runCode: string;
  status: string;
  sampleSize: number;
  horizonDays: number;
  engineVersion: string | null;
  randomSeed: string | null;
  failureCode: string | null;
  failureMessage: string | null;
}

const TRANSITIONS: Record<string, readonly string[]> = {
  queued: ['running', 'cancelled'],
  running: ['completed', 'failed', 'cancelled'],
};

function rowToRequest(row: Record<string, unknown>): SimulationRequest {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    scenarioVersionId: row.scenario_version_id as string,
    requestCode: row.request_code as string,
    idempotencyKey: row.idempotency_key as string,
  };
}

function rowToRun(row: Record<string, unknown>): SimulationRun {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    requestId: row.request_id as string,
    modelVersionId: row.model_version_id as string,
    runCode: row.run_code as string,
    status: row.status as string,
    sampleSize: row.sample_size as number,
    horizonDays: row.horizon_days as number,
    engineVersion: row.engine_version as string | null,
    randomSeed: row.random_seed as string | null,
    failureCode: row.failure_code as string | null,
    failureMessage: row.failure_message as string | null,
  };
}

export class SimulationRunRepository {
  async createRequest(ctx: TenantContext, businessId: string, scenarioVersionId: string, requestCode: string, idempotencyKey: string): Promise<{ request: SimulationRequest; idempotentReplay: boolean }> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT * FROM simulation.simulation_requests WHERE business_id = $1 AND idempotency_key = $2',
        [businessId, idempotencyKey]
      );
      if (existing.rows.length > 0) return { request: rowToRequest(existing.rows[0]), idempotentReplay: true };
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_requests (tenant_id, workspace_id, business_id, scenario_version_id, request_code, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, scenarioVersionId, requestCode, idempotencyKey]
      );
      return { request: rowToRequest(result.rows[0]), idempotentReplay: false };
    });
  }

  async createRun(ctx: TenantContext, businessId: string, requestId: string, modelVersionId: string, runCode: string, opts: { sampleSize?: number; horizonDays?: number } = {}): Promise<SimulationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_runs (tenant_id, workspace_id, business_id, request_id, model_version_id, run_code, sample_size, horizon_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, requestId, modelVersionId, runCode, opts.sampleSize ?? 500, opts.horizonDays ?? 90]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async recordInput(ctx: TenantContext, runId: string, businessId: string, parameterCode: string, inputValue: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_run_inputs (run_id, tenant_id, workspace_id, business_id, parameter_code, input_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [runId, ctx.tenantId, ctx.workspaceId, businessId, parameterCode, JSON.stringify(inputValue)]
      );
    });
  }

  async transitionRun(ctx: TenantContext, runId: string, toStatus: string, extra: { engineVersion?: string; randomSeed?: string | null; failureCode?: string; failureMessage?: string } = {}): Promise<SimulationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_runs WHERE id = $1', [runId]);
      if (current.rows.length === 0) throw new SimulationRunNotFoundError('SimulationRun', runId);
      const fromStatus = current.rows[0].status as string;
      if (!(TRANSITIONS[fromStatus] ?? []).includes(toStatus)) {
        throw new InvalidTransitionError('SimulationRun', fromStatus, toStatus);
      }
      const setClauses: string[] = ['status = $2'];
      const values: unknown[] = [runId, toStatus];
      let i = 3;
      if (toStatus === 'running') { setClauses.push(`started_at = now()`); }
      if (['completed', 'failed', 'cancelled'].includes(toStatus)) { setClauses.push(`completed_at = now()`); }
      if (extra.engineVersion !== undefined) { setClauses.push(`engine_version = $${i}`); values.push(extra.engineVersion); i += 1; }
      if (extra.randomSeed !== undefined) { setClauses.push(`random_seed = $${i}`); values.push(extra.randomSeed); i += 1; }
      if (extra.failureCode !== undefined) { setClauses.push(`failure_code = $${i}`); values.push(extra.failureCode); i += 1; }
      if (extra.failureMessage !== undefined) { setClauses.push(`failure_message = $${i}`); values.push(extra.failureMessage); }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_runs SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );
      await client.query(
        `INSERT INTO simulation.simulation_run_status_history (run_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [runId, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, randomUUID()]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async recordIteration(ctx: TenantContext, runId: string, businessId: string, iterationNumber: number, outcomeValue: number, metricCode = 'final_cash'): Promise<void> {
    if (!Number.isInteger(iterationNumber) || iterationNumber < 1) {
      throw new ValidationError('SimulationIteration', ['iteration_number must be a positive integer']);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_iterations (run_id, tenant_id, workspace_id, business_id, iteration_number, outcome_value, metric_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [runId, ctx.tenantId, ctx.workspaceId, businessId, iterationNumber, outcomeValue, metricCode]
      );
    });
  }

  async recordIterationSummary(ctx: TenantContext, runId: string, businessId: string, metricCode: string, summary: { sampleSize: number; meanValue?: number; stddevValue?: number; minValue?: number; maxValue?: number }): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_iteration_summaries (run_id, tenant_id, workspace_id, business_id, metric_code, sample_size, mean_value, stddev_value, min_value, max_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [runId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, summary.sampleSize, summary.meanValue ?? null, summary.stddevValue ?? null, summary.minValue ?? null, summary.maxValue ?? null]
      );
    });
  }

  async recordDistribution(ctx: TenantContext, runId: string, businessId: string, metricCode: string, distributionType: string, parameters: Record<string, unknown> = {}): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_distributions (run_id, tenant_id, workspace_id, business_id, metric_code, distribution_type, parameters)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [runId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, distributionType, JSON.stringify(parameters)]
      );
    });
  }

  async recordPercentiles(ctx: TenantContext, runId: string, businessId: string, metricCode: string, percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number; basis?: string; currencyCode?: string }): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_percentiles (run_id, tenant_id, workspace_id, business_id, metric_code, basis, currency_code, p10, p25, p50, p75, p90)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [runId, ctx.tenantId, ctx.workspaceId, businessId, metricCode, percentiles.basis ?? 'final_cash', percentiles.currencyCode ?? null,
         percentiles.p10, percentiles.p25, percentiles.p50, percentiles.p75, percentiles.p90]
      );
    });
  }

  async getRun(ctx: TenantContext, runId: string): Promise<SimulationRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_runs WHERE id = $1', [runId]);
      if (result.rows.length === 0) throw new SimulationRunNotFoundError('SimulationRun', runId);
      return rowToRun(result.rows[0]);
    });
  }

  async listRunsByRequest(ctx: TenantContext, requestId: string): Promise<SimulationRun[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM simulation.simulation_runs WHERE request_id = $1 ORDER BY created_at', [requestId]
      );
      return result.rows.map(rowToRun);
    });
  }
}
