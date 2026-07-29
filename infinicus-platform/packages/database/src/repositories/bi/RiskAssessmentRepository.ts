import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ValidationError } from './errors.js';

export interface RiskModel {
  id: string;
  businessId: string;
  modelCode: string;
  modelVersion: string;
  domain: string;
  status: string;
}

export interface RiskAssessment {
  id: string;
  riskModelId: string;
  businessId: string;
  riskScore: number;
  likelihood: number;
  severity: string;
  publicationStatus: string;
  correlationId: string;
}

export interface BenchmarkDefinition {
  id: string;
  businessId: string;
  benchmarkCode: string;
  status: string;
}

export interface ComparisonResult {
  id: string;
  comparisonRunId: string;
  businessValue: number;
  peerValue: number;
  confidence: number;
}

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

function rowToRiskModel(row: Record<string, unknown>): RiskModel {
  return { id: row.id as string, businessId: row.business_id as string, modelCode: row.model_code as string, modelVersion: row.model_version as string, domain: row.domain as string, status: row.status as string };
}

function rowToAssessment(row: Record<string, unknown>): RiskAssessment {
  return {
    id: row.id as string,
    riskModelId: row.risk_model_id as string,
    businessId: row.business_id as string,
    riskScore: parseFloat(String(row.risk_score)),
    likelihood: parseFloat(String(row.likelihood)),
    severity: row.severity as string,
    publicationStatus: row.publication_status as string,
    correlationId: row.correlation_id as string,
  };
}

function rowToBenchmark(row: Record<string, unknown>): BenchmarkDefinition {
  return { id: row.id as string, businessId: row.business_id as string, benchmarkCode: row.benchmark_code as string, status: row.status as string };
}

function rowToComparisonResult(row: Record<string, unknown>): ComparisonResult {
  return { id: row.id as string, comparisonRunId: row.comparison_run_id as string, businessValue: parseFloat(String(row.business_value)), peerValue: parseFloat(String(row.peer_value)), confidence: parseFloat(String(row.confidence)) };
}

export class RiskAssessmentRepository {
  async createModel(ctx: TenantContext, businessId: string, modelCode: string, modelVersion: string, domain: string): Promise<RiskModel> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.risk_models (tenant_id, workspace_id, business_id, model_code, model_version, domain)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, modelCode, modelVersion, domain]
      );
      return rowToRiskModel(result.rows[0]);
    });
  }

  /**
   * risk_assessments is append-only (§9): the publication_status is fixed at
   * creation time, never transitioned via UPDATE. A correction publishes a
   * new assessment row rather than mutating an existing one.
   */
  async recordAssessment(
    ctx: TenantContext, riskModelId: string, businessId: string, riskScore: number, likelihood: number, severity: string,
    limitations: unknown[] = [], publicationStatus: 'draft' | 'published' = 'draft'
  ): Promise<RiskAssessment> {
    if (riskScore < 0 || riskScore > 1) throw new ValidationError('RiskAssessment', ['risk_score must be between 0 and 1']);
    if (likelihood < 0 || likelihood > 1) throw new ValidationError('RiskAssessment', ['likelihood must be between 0 and 1']);
    if (!VALID_SEVERITIES.includes(severity)) throw new ValidationError('RiskAssessment', [`unknown severity: ${severity}`]);
    return withTenantTransaction(ctx, async (client) => {
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.risk_assessments
           (risk_model_id, tenant_id, workspace_id, business_id, risk_score, likelihood, severity, limitations, publication_status, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [riskModelId, ctx.tenantId, ctx.workspaceId, businessId, riskScore, likelihood, severity, JSON.stringify(limitations), publicationStatus, correlationId]
      );
      return rowToAssessment(result.rows[0]);
    });
  }

  /** Publishes by creating a new append-only assessment row with the same inputs, marked published. */
  async publishAssessment(ctx: TenantContext, id: string): Promise<RiskAssessment> {
    return withTenantTransaction(ctx, async (client) => {
      const draft = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.risk_assessments WHERE id = $1', [id]);
      if (draft.rows.length === 0) throw new NotFoundError('RiskAssessment', id);
      if (draft.rows[0].publication_status !== 'draft') throw new NotFoundError('RiskAssessment', id);
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.risk_assessments
           (risk_model_id, tenant_id, workspace_id, business_id, risk_score, likelihood, severity, limitations, publication_status, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'published',$9)
         RETURNING *`,
        [
          draft.rows[0].risk_model_id, ctx.tenantId, ctx.workspaceId, draft.rows[0].business_id,
          draft.rows[0].risk_score, draft.rows[0].likelihood, draft.rows[0].severity, draft.rows[0].limitations,
          draft.rows[0].correlation_id,
        ]
      );
      return rowToAssessment(result.rows[0]);
    });
  }

  async findAssessmentById(ctx: TenantContext, id: string): Promise<RiskAssessment> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.risk_assessments WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('RiskAssessment', id);
      return rowToAssessment(result.rows[0]);
    });
  }

  async recordFactor(ctx: TenantContext, riskAssessmentId: string, businessId: string, factorCode: string, weight: number, evidenceReference: Record<string, unknown> = {}): Promise<void> {
    if (weight < 0 || weight > 1) throw new ValidationError('RiskFactor', ['weight must be between 0 and 1']);
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_intelligence.risk_factors (risk_assessment_id, tenant_id, workspace_id, business_id, factor_code, weight, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [riskAssessmentId, ctx.tenantId, ctx.workspaceId, businessId, factorCode, weight, JSON.stringify(evidenceReference)]
      );
    });
  }

  async createBenchmark(ctx: TenantContext, businessId: string, benchmarkCode: string, peerCohortReference: Record<string, unknown> = {}): Promise<BenchmarkDefinition> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.benchmark_definitions (tenant_id, workspace_id, business_id, benchmark_code, peer_cohort_reference)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, benchmarkCode, JSON.stringify(peerCohortReference)]
      );
      return rowToBenchmark(result.rows[0]);
    });
  }

  async recordComparison(
    ctx: TenantContext, benchmarkDefinitionId: string, businessId: string,
    periodStart: Date, periodEnd: Date, businessValue: number, peerValue: number, confidence: number
  ): Promise<ComparisonResult> {
    if (confidence < 0 || confidence > 1) throw new ValidationError('ComparisonResult', ['confidence must be between 0 and 1']);
    if (periodEnd <= periodStart) throw new ValidationError('BenchmarkDataset', ['period_end must be after period_start']);
    return withTenantTransaction(ctx, async (client) => {
      const dataset = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.benchmark_datasets (benchmark_definition_id, tenant_id, workspace_id, business_id, period_start, period_end)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [benchmarkDefinitionId, ctx.tenantId, ctx.workspaceId, businessId, periodStart, periodEnd]
      );
      const run = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.comparison_runs (benchmark_definition_id, benchmark_dataset_id, tenant_id, workspace_id, business_id)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [benchmarkDefinitionId, dataset.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId]
      );
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.comparison_results (comparison_run_id, tenant_id, workspace_id, business_id, business_value, peer_value, confidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [run.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, businessValue, peerValue, confidence]
      );
      return rowToComparisonResult(result.rows[0]);
    });
  }
}
