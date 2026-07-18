import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './DataSourceRepository.js';

export interface ProvenanceRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  dataSourceId: string;
  collectionRunId: string | null;
  recordReference: string;
  sourceReference: string;
  sourceHash: string | null;
  transformationChain: unknown[];
  evidenceReferences: unknown[];
  parentProvenanceId: string | null;
  lineageDepth: number;
  createdAt: Date;
  correlationId: string;
}

export interface CreateProvenanceRecordInput {
  businessId?: string;
  dataSourceId: string;
  collectionRunId?: string;
  recordReference: string;
  sourceReference: string;
  sourceHash?: string;
  transformationChain?: unknown[];
  evidenceReferences?: unknown[];
  parentProvenanceId?: string;
  correlationId?: string;
}

export interface TransformationRecord {
  id: string;
  provenanceRecordId: string;
  transformationType: string;
  transformationVersion: string;
  inputHash: string | null;
  outputHash: string | null;
  parameters: Record<string, unknown>;
  performedByType: string;
  performedById: string | null;
  performedAt: Date;
  createdAt: Date;
}

export interface CreateTransformationRecordInput {
  transformationType: string;
  transformationVersion?: string;
  inputHash?: string;
  outputHash?: string;
  parameters?: Record<string, unknown>;
  performedByType: string;
  performedById?: string;
  performedAt?: Date;
}

function rowToProvenance(row: Record<string, unknown>): ProvenanceRecord {
  return {
    id:                  row.id                   as string,
    tenantId:            row.tenant_id             as string,
    workspaceId:         row.workspace_id          as string,
    businessId:          row.business_id           as string | null,
    dataSourceId:        row.data_source_id        as string,
    collectionRunId:     row.collection_run_id     as string | null,
    recordReference:     row.record_reference      as string,
    sourceReference:     row.source_reference      as string,
    sourceHash:          row.source_hash           as string | null,
    transformationChain: row.transformation_chain  as unknown[],
    evidenceReferences:  row.evidence_references   as unknown[],
    parentProvenanceId:  row.parent_provenance_id  as string | null,
    lineageDepth:        row.lineage_depth         as number,
    createdAt:           row.created_at            as Date,
    correlationId:       row.correlation_id        as string,
  };
}

function rowToTransformation(row: Record<string, unknown>): TransformationRecord {
  return {
    id:                    row.id                     as string,
    provenanceRecordId:    row.provenance_record_id   as string,
    transformationType:    row.transformation_type    as string,
    transformationVersion: row.transformation_version as string,
    inputHash:             row.input_hash             as string | null,
    outputHash:            row.output_hash            as string | null,
    parameters:            row.parameters             as Record<string, unknown>,
    performedByType:       row.performed_by_type      as string,
    performedById:         row.performed_by_id        as string | null,
    performedAt:           row.performed_at           as Date,
    createdAt:             row.created_at             as Date,
  };
}

export class ProvenanceRepository {
  async create(
    ctx: TenantContext,
    input: CreateProvenanceRecordInput,
    transformations: CreateTransformationRecordInput[] = []
  ): Promise<{ provenance: ProvenanceRecord; transformations: TransformationRecord[] }> {
    return withTenantTransaction(ctx, async (client) => {
      const parentDepth = input.parentProvenanceId
        ? await this._getDepth(client, input.parentProvenanceId)
        : -1;

      const result: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.provenance_records
           (tenant_id, workspace_id, business_id, data_source_id, collection_run_id,
            record_reference, source_reference, source_hash, transformation_chain,
            evidence_references, parent_provenance_id, lineage_depth, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.businessId          ?? null,
          input.dataSourceId,
          input.collectionRunId     ?? null,
          input.recordReference,
          input.sourceReference,
          input.sourceHash          ?? null,
          JSON.stringify(input.transformationChain ?? []),
          JSON.stringify(input.evidenceReferences  ?? []),
          input.parentProvenanceId  ?? null,
          parentDepth + 1,
          input.correlationId       ?? null,
        ]
      );
      const provenance = rowToProvenance(result.rows[0]);
      const createdTransformations: TransformationRecord[] = [];

      for (const t of transformations) {
        const tRow = await client.query<Record<string, unknown>>(
          `INSERT INTO data_acquisition.transformation_records
             (provenance_record_id, transformation_type, transformation_version,
              input_hash, output_hash, parameters, performed_by_type, performed_by_id, performed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING *`,
          [
            provenance.id,
            t.transformationType,
            t.transformationVersion ?? '1.0',
            t.inputHash             ?? null,
            t.outputHash            ?? null,
            JSON.stringify(t.parameters ?? {}),
            t.performedByType,
            t.performedById         ?? null,
            t.performedAt           ?? new Date(),
          ]
        );
        createdTransformations.push(rowToTransformation(tRow.rows[0]));
      }

      return { provenance, transformations: createdTransformations };
    });
  }

  private async _getDepth(client: import('pg').PoolClient, id: string): Promise<number> {
    const r = await client.query<{ lineage_depth: number }>(
      'SELECT lineage_depth FROM data_acquisition.provenance_records WHERE id = $1',
      [id]
    );
    return r.rows[0]?.lineage_depth ?? 0;
  }

  async findById(ctx: TenantContext, id: string): Promise<ProvenanceRecord> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.provenance_records WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('ProvenanceRecord', id);
      return rowToProvenance(result.rows[0]);
    });
  }

  async listTransformations(ctx: TenantContext, provenanceId: string): Promise<TransformationRecord[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.transformation_records
         WHERE provenance_record_id = $1
         ORDER BY performed_at ASC`,
        [provenanceId]
      );
      return result.rows.map(rowToTransformation);
    });
  }
}
