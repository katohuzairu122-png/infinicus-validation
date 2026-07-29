import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ValidationError } from './errors.js';

export interface Finding {
  id: string;
  businessId: string;
  findingCode: string;
  domain: string;
  latestVersion: number;
  supersededBy: string | null;
  publicationStatus: string;
}

export interface FindingVersion {
  id: string;
  findingId: string;
  versionNumber: number;
  title: string;
  statement: string;
  confidence: number;
  materiality: string;
  limitations: unknown[];
}

export interface Trend {
  id: string;
  businessId: string;
  trendCode: string;
  status: string;
  latestVersion: number;
}

export interface TrendObservation {
  id: string;
  trendId: string;
  versionNumber: number;
  direction: string;
  magnitude: number;
  confidence: number;
}

export interface CreateFindingInput {
  businessId: string;
  findingCode: string;
  domain: string;
  analysisRunId?: string;
  title: string;
  statement: string;
  confidence: number;
  materiality: 'low' | 'medium' | 'high' | 'critical';
  limitations?: unknown[];
}

function rowToFinding(row: Record<string, unknown>): Finding {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    findingCode: row.finding_code as string,
    domain: row.domain as string,
    latestVersion: row.latest_version as number,
    supersededBy: row.superseded_by as string | null,
    publicationStatus: row.publication_status as string,
  };
}

function rowToFindingVersion(row: Record<string, unknown>): FindingVersion {
  return {
    id: row.id as string,
    findingId: row.finding_id as string,
    versionNumber: row.version_number as number,
    title: row.title as string,
    statement: row.statement as string,
    confidence: parseFloat(String(row.confidence)),
    materiality: row.materiality as string,
    limitations: row.limitations as unknown[],
  };
}

function rowToTrend(row: Record<string, unknown>): Trend {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    trendCode: row.trend_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToTrendObservation(row: Record<string, unknown>): TrendObservation {
  return {
    id: row.id as string,
    trendId: row.trend_id as string,
    versionNumber: row.version_number as number,
    direction: row.direction as string,
    magnitude: parseFloat(String(row.magnitude)),
    confidence: parseFloat(String(row.confidence)),
  };
}

export class AnalysisResultRepository {
  async recordInput(ctx: TenantContext, analysisRunId: string, businessId: string, inputType: string, inputReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_intelligence.analysis_inputs (analysis_run_id, tenant_id, workspace_id, business_id, input_type, input_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [analysisRunId, ctx.tenantId, ctx.workspaceId, businessId, inputType, JSON.stringify(inputReference)]
      );
    });
  }

  async recordOutput(ctx: TenantContext, analysisRunId: string, businessId: string, outputType: string, outputReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_intelligence.analysis_outputs (analysis_run_id, tenant_id, workspace_id, business_id, output_type, output_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [analysisRunId, ctx.tenantId, ctx.workspaceId, businessId, outputType, JSON.stringify(outputReference)]
      );
    });
  }

  async listInputs(ctx: TenantContext, analysisRunId: string): Promise<unknown[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query('SELECT * FROM business_intelligence.analysis_inputs WHERE analysis_run_id = $1', [analysisRunId]);
      return result.rows;
    });
  }

  async listOutputs(ctx: TenantContext, analysisRunId: string): Promise<unknown[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query('SELECT * FROM business_intelligence.analysis_outputs WHERE analysis_run_id = $1', [analysisRunId]);
      return result.rows;
    });
  }

  async createFinding(ctx: TenantContext, input: CreateFindingInput): Promise<{ finding: Finding; version: FindingVersion }> {
    if (input.confidence < 0 || input.confidence > 1) {
      throw new ValidationError('Finding', ['confidence must be between 0 and 1']);
    }
    return withTenantTransaction(ctx, async (client) => {
      const finding = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.findings (tenant_id, workspace_id, business_id, analysis_run_id, finding_code, domain, latest_version)
         VALUES ($1,$2,$3,$4,$5,$6,1)
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, input.businessId, input.analysisRunId ?? null, input.findingCode, input.domain]
      );
      const version = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.finding_versions
           (finding_id, tenant_id, workspace_id, business_id, version_number, title, statement, confidence, materiality, limitations)
         VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9)
         RETURNING *`,
        [finding.rows[0].id, ctx.tenantId, ctx.workspaceId, input.businessId, input.title, input.statement, input.confidence, input.materiality, JSON.stringify(input.limitations ?? [])]
      );
      return { finding: rowToFinding(finding.rows[0]), version: rowToFindingVersion(version.rows[0]) };
    });
  }

  async publishFinding(ctx: TenantContext, findingId: string): Promise<Finding> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_intelligence.findings SET publication_status = 'published' WHERE id = $1 RETURNING *`,
        [findingId]
      );
      if (result.rows.length === 0) throw new NotFoundError('Finding', findingId);
      return rowToFinding(result.rows[0]);
    });
  }

  /** Supersedes a published finding by creating a new finding + version and pointing the old one at it. */
  async supersedeFinding(ctx: TenantContext, oldFindingId: string, input: CreateFindingInput): Promise<{ finding: Finding; version: FindingVersion }> {
    return withTenantTransaction(ctx, async (client) => {
      const old = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.findings WHERE id = $1', [oldFindingId]);
      if (old.rows.length === 0) throw new NotFoundError('Finding', oldFindingId);

      const finding = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.findings (tenant_id, workspace_id, business_id, analysis_run_id, finding_code, domain, latest_version, publication_status)
         VALUES ($1,$2,$3,$4,$5,$6,1,'published')
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, input.businessId, input.analysisRunId ?? null, input.findingCode, input.domain]
      );
      const version = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.finding_versions
           (finding_id, tenant_id, workspace_id, business_id, version_number, title, statement, confidence, materiality, limitations)
         VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9)
         RETURNING *`,
        [finding.rows[0].id, ctx.tenantId, ctx.workspaceId, input.businessId, input.title, input.statement, input.confidence, input.materiality, JSON.stringify(input.limitations ?? [])]
      );
      await client.query(
        `UPDATE business_intelligence.findings SET publication_status = 'superseded', superseded_by = $2 WHERE id = $1`,
        [oldFindingId, finding.rows[0].id]
      );
      return { finding: rowToFinding(finding.rows[0]), version: rowToFindingVersion(version.rows[0]) };
    });
  }

  async findFindingById(ctx: TenantContext, id: string): Promise<Finding> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.findings WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('Finding', id);
      return rowToFinding(result.rows[0]);
    });
  }

  async listFindingVersions(ctx: TenantContext, findingId: string): Promise<FindingVersion[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_intelligence.finding_versions WHERE finding_id = $1 ORDER BY version_number', [findingId]
      );
      return result.rows.map(rowToFindingVersion);
    });
  }

  async recordFindingEvidence(ctx: TenantContext, findingVersionId: string, businessId: string, evidenceType: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_intelligence.finding_evidence (finding_version_id, tenant_id, workspace_id, business_id, evidence_type, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [findingVersionId, ctx.tenantId, ctx.workspaceId, businessId, evidenceType, JSON.stringify(evidenceReference)]
      );
    });
  }

  async createTrend(ctx: TenantContext, businessId: string, trendCode: string): Promise<Trend> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.trends (tenant_id, workspace_id, business_id, trend_code, latest_version)
         VALUES ($1,$2,$3,$4,0) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, trendCode]
      );
      return rowToTrend(result.rows[0]);
    });
  }

  async recordTrendObservation(
    ctx: TenantContext, trendId: string, businessId: string,
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile', magnitude: number,
    periodStart: Date, periodEnd: Date, confidence: number
  ): Promise<TrendObservation> {
    if (periodEnd <= periodStart) throw new ValidationError('TrendObservation', ['period_end must be after period_start']);
    return withTenantTransaction(ctx, async (client) => {
      const trend = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.trends WHERE id = $1', [trendId]);
      if (trend.rows.length === 0) throw new NotFoundError('Trend', trendId);
      const nextVersion = (trend.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.trend_observations
           (trend_id, tenant_id, workspace_id, business_id, version_number, direction, magnitude, period_start, period_end, confidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [trendId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, direction, magnitude, periodStart, periodEnd, confidence]
      );
      await client.query('UPDATE business_intelligence.trends SET latest_version = $2 WHERE id = $1', [trendId, nextVersion]);
      return rowToTrendObservation(result.rows[0]);
    });
  }
}
