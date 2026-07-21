import { randomUUID } from 'crypto';
import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './DataSourceRepository.js';

export interface DataQualityScore {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  dataSourceId: string;
  collectionRunId: string | null;
  scopeType: string;
  scopeReference: string | null;
  completeness: number;
  validity: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
  conformity: number;
  overallScore: number;
  weights: Record<string, unknown>;
  scoreDetails: Record<string, unknown>;
  scoredAt: Date;
  correlationId: string;
  createdAt: Date;
}

export interface CreateDataQualityScoreInput {
  businessId?: string;
  dataSourceId: string;
  collectionRunId?: string;
  scopeType?: string;
  scopeReference?: string;
  completeness: number;
  validity: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
  conformity: number;
  overallScore: number;
  weights?: Record<string, unknown>;
  scoreDetails?: Record<string, unknown>;
  correlationId?: string;
}

function rowToScore(row: Record<string, unknown>): DataQualityScore {
  return {
    id:              row.id               as string,
    tenantId:        row.tenant_id        as string,
    workspaceId:     row.workspace_id     as string,
    businessId:      row.business_id      as string | null,
    dataSourceId:    row.data_source_id   as string,
    collectionRunId: row.collection_run_id as string | null,
    scopeType:       row.scope_type       as string,
    scopeReference:  row.scope_reference  as string | null,
    completeness:    Number(row.completeness),
    validity:        Number(row.validity),
    consistency:     Number(row.consistency),
    timeliness:      Number(row.timeliness),
    uniqueness:      Number(row.uniqueness),
    conformity:      Number(row.conformity),
    overallScore:    Number(row.overall_score),
    weights:         row.weights          as Record<string, unknown>,
    scoreDetails:    row.score_details    as Record<string, unknown>,
    scoredAt:        row.scored_at        as Date,
    correlationId:   row.correlation_id   as string,
    createdAt:       row.created_at       as Date,
  };
}

export class DataQualityScoreRepository {
  async create(ctx: TenantContext, input: CreateDataQualityScoreInput): Promise<DataQualityScore> {
    return withTenantTransaction(ctx, async (client) => {
      const result: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.data_quality_scores
           (tenant_id, workspace_id, business_id, data_source_id, collection_run_id,
            scope_type, scope_reference, completeness, validity, consistency,
            timeliness, uniqueness, conformity, overall_score, weights, score_details,
            correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.businessId      ?? null,
          input.dataSourceId,
          input.collectionRunId ?? null,
          input.scopeType       ?? 'run',
          input.scopeReference  ?? null,
          input.completeness,
          input.validity,
          input.consistency,
          input.timeliness,
          input.uniqueness,
          input.conformity,
          input.overallScore,
          JSON.stringify(input.weights      ?? {}),
          JSON.stringify(input.scoreDetails ?? {}),
          input.correlationId   ?? randomUUID(),
        ]
      );
      return rowToScore(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<DataQualityScore> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.data_quality_scores WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('DataQualityScore', id);
      return rowToScore(result.rows[0]);
    });
  }

  async latestForSource(ctx: TenantContext, dataSourceId: string): Promise<DataQualityScore | null> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.data_quality_scores
         WHERE data_source_id = $1
         ORDER BY scored_at DESC
         LIMIT 1`,
        [dataSourceId]
      );
      return result.rows.length > 0 ? rowToScore(result.rows[0]) : null;
    });
  }
}
