import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ValidationError, InvalidTransitionError } from './errors.js';

export interface ForecastModel {
  id: string;
  businessId: string;
  modelCode: string;
  modelVersion: string;
  algorithm: string;
  status: string;
}

export interface ForecastRun {
  id: string;
  forecastRequestId: string;
  businessId: string;
  status: string;
  publicationStatus: string;
  correlationId: string;
}

export interface ForecastPoint {
  id: string;
  forecastRunId: string;
  sequenceNumber: number;
  periodStart: Date;
  periodEnd: Date;
  predictedValue: number;
  confidenceLow: number;
  confidenceHigh: number;
  confidenceLevel: number;
}

export interface ForecastAccuracyRecord {
  id: string;
  forecastPointId: string;
  actualValue: number;
  absoluteError: number;
}

const RUN_TRANSITIONS: Record<string, string[]> = {
  running: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

function rowToModel(row: Record<string, unknown>): ForecastModel {
  return { id: row.id as string, businessId: row.business_id as string, modelCode: row.model_code as string, modelVersion: row.model_version as string, algorithm: row.algorithm as string, status: row.status as string };
}

function rowToRun(row: Record<string, unknown>): ForecastRun {
  return { id: row.id as string, forecastRequestId: row.forecast_request_id as string, businessId: row.business_id as string, status: row.status as string, publicationStatus: row.publication_status as string, correlationId: row.correlation_id as string };
}

function rowToPoint(row: Record<string, unknown>): ForecastPoint {
  return {
    id: row.id as string,
    forecastRunId: row.forecast_run_id as string,
    sequenceNumber: row.sequence_number as number,
    periodStart: row.period_start as Date,
    periodEnd: row.period_end as Date,
    predictedValue: parseFloat(String(row.predicted_value)),
    confidenceLow: parseFloat(String(row.confidence_low)),
    confidenceHigh: parseFloat(String(row.confidence_high)),
    confidenceLevel: parseFloat(String(row.confidence_level)),
  };
}

function rowToAccuracy(row: Record<string, unknown>): ForecastAccuracyRecord {
  return { id: row.id as string, forecastPointId: row.forecast_point_id as string, actualValue: parseFloat(String(row.actual_value)), absoluteError: parseFloat(String(row.absolute_error)) };
}

export class ForecastRepository {
  async createModel(ctx: TenantContext, businessId: string, modelCode: string, modelVersion: string, algorithm: string): Promise<ForecastModel> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.forecast_models (tenant_id, workspace_id, business_id, model_code, model_version, algorithm)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, modelCode, modelVersion, algorithm]
      );
      return rowToModel(result.rows[0]);
    });
  }

  async createRun(ctx: TenantContext, businessId: string, metricDefinitionId: string, forecastModelId: string, horizonPeriods: number, timeGrain: string): Promise<ForecastRun> {
    return withTenantTransaction(ctx, async (client) => {
      const req = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.forecast_requests
           (tenant_id, workspace_id, business_id, metric_definition_id, forecast_model_id, horizon_periods, time_grain, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'requested')
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, metricDefinitionId, forecastModelId, horizonPeriods, timeGrain]
      );
      const correlationId = randomUUID();
      const run = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.forecast_runs (forecast_request_id, tenant_id, workspace_id, business_id, correlation_id, started_at)
         VALUES ($1,$2,$3,$4,$5,now())
         RETURNING *`,
        [req.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, correlationId]
      );
      return rowToRun(run.rows[0]);
    });
  }

  async findRunById(ctx: TenantContext, id: string): Promise<ForecastRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.forecast_runs WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('ForecastRun', id);
      return rowToRun(result.rows[0]);
    });
  }

  async transitionRun(ctx: TenantContext, id: string, toStatus: 'completed' | 'failed' | 'cancelled'): Promise<ForecastRun> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.forecast_runs WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('ForecastRun', id);
      const fromStatus = current.rows[0].status as string;
      if (!RUN_TRANSITIONS[fromStatus]?.includes(toStatus)) throw new InvalidTransitionError('ForecastRun', fromStatus, toStatus);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_intelligence.forecast_runs SET status = $2, completed_at = now() WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      return rowToRun(result.rows[0]);
    });
  }

  async addPoint(ctx: TenantContext, forecastRunId: string, businessId: string, sequenceNumber: number, periodStart: Date, periodEnd: Date, predictedValue: number, confidenceLow: number, confidenceHigh: number, confidenceLevel: number, unit: string): Promise<ForecastPoint> {
    if (confidenceHigh < confidenceLow) throw new ValidationError('ForecastPoint', ['confidence_high must be >= confidence_low']);
    if (confidenceLevel < 0 || confidenceLevel > 1) throw new ValidationError('ForecastPoint', ['confidence_level must be between 0 and 1']);
    return withTenantTransaction(ctx, async (client) => {
      const run = await client.query<Record<string, unknown>>('SELECT publication_status FROM business_intelligence.forecast_runs WHERE id = $1', [forecastRunId]);
      if (run.rows.length === 0) throw new NotFoundError('ForecastRun', forecastRunId);
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.forecast_points
           (forecast_run_id, tenant_id, workspace_id, business_id, sequence_number, period_start, period_end,
            predicted_value, confidence_low, confidence_high, confidence_level, unit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [forecastRunId, ctx.tenantId, ctx.workspaceId, businessId, sequenceNumber, periodStart, periodEnd, predictedValue, confidenceLow, confidenceHigh, confidenceLevel, unit]
      );
      return rowToPoint(result.rows[0]);
    });
  }

  async listPoints(ctx: TenantContext, forecastRunId: string): Promise<ForecastPoint[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_intelligence.forecast_points WHERE forecast_run_id = $1 ORDER BY sequence_number', [forecastRunId]
      );
      return result.rows.map(rowToPoint);
    });
  }

  async publishRun(ctx: TenantContext, forecastRunId: string): Promise<ForecastRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_intelligence.forecast_runs SET publication_status = 'published' WHERE id = $1 AND status = 'completed' RETURNING *`,
        [forecastRunId]
      );
      if (result.rows.length === 0) throw new NotFoundError('ForecastRun', forecastRunId);
      return rowToRun(result.rows[0]);
    });
  }

  async recordAccuracy(ctx: TenantContext, forecastPointId: string, businessId: string, actualValue: number, evaluationPeriodStart: Date, evaluationPeriodEnd: Date): Promise<ForecastAccuracyRecord> {
    if (evaluationPeriodEnd <= evaluationPeriodStart) throw new ValidationError('ForecastAccuracyRecord', ['evaluation_period_end must be after evaluation_period_start']);
    return withTenantTransaction(ctx, async (client) => {
      const point = await client.query<Record<string, unknown>>('SELECT predicted_value FROM business_intelligence.forecast_points WHERE id = $1', [forecastPointId]);
      if (point.rows.length === 0) throw new NotFoundError('ForecastPoint', forecastPointId);
      const predicted = parseFloat(String(point.rows[0].predicted_value));
      const absoluteError = Math.abs(actualValue - predicted);
      const percentageError = actualValue !== 0 ? (absoluteError / Math.abs(actualValue)) * 100 : null;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.forecast_accuracy_records
           (forecast_point_id, tenant_id, workspace_id, business_id, actual_value, absolute_error, percentage_error, evaluation_period_start, evaluation_period_end)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [forecastPointId, ctx.tenantId, ctx.workspaceId, businessId, actualValue, absoluteError, percentageError, evaluationPeriodStart, evaluationPeriodEnd]
      );
      return rowToAccuracy(result.rows[0]);
    });
  }
}
