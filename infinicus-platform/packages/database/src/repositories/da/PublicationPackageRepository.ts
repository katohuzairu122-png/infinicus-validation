import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './DataSourceRepository.js';

export interface PublicationPackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  packageType: string;
  packageVersion: string;
  targetLayer: string;
  targetBlock: string;
  dataReference: Record<string, unknown>;
  recordCount: number;
  qualityScore: number | null;
  reliabilityScore: number | null;
  schemaReferenceId: string | null;
  provenanceReferenceIds: unknown[];
  limitations: unknown[];
  status: string;
  publishedAt: Date | null;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreatePublicationPackageInput {
  businessId?: string;
  packageType: string;
  packageVersion?: string;
  targetLayer: string;
  targetBlock: string;
  dataReference?: Record<string, unknown>;
  recordCount: number;
  qualityScore?: number;
  reliabilityScore?: number;
  schemaReferenceId?: string;
  provenanceReferenceIds?: string[];
  limitations?: unknown[];
  status?: string;
  correlationId?: string;
  createdBy?: string;
}

function rowToPackage(row: Record<string, unknown>): PublicationPackage {
  return {
    id:                     row.id                      as string,
    tenantId:               row.tenant_id               as string,
    workspaceId:            row.workspace_id            as string,
    businessId:             row.business_id             as string | null,
    packageType:            row.package_type            as string,
    packageVersion:         row.package_version         as string,
    targetLayer:            row.target_layer            as string,
    targetBlock:            row.target_block            as string,
    dataReference:          row.data_reference          as Record<string, unknown>,
    recordCount:            row.record_count            as number,
    qualityScore:           row.quality_score !== null ? Number(row.quality_score) : null,
    reliabilityScore:       row.reliability_score !== null ? Number(row.reliability_score) : null,
    schemaReferenceId:      row.schema_reference_id     as string | null,
    provenanceReferenceIds: row.provenance_reference_ids as unknown[],
    limitations:            row.limitations             as unknown[],
    status:                 row.status                  as string,
    publishedAt:            row.published_at            as Date | null,
    correlationId:          row.correlation_id          as string,
    createdAt:              row.created_at              as Date,
    updatedAt:              row.updated_at              as Date,
    createdBy:              row.created_by              as string | null,
  };
}

export class PublicationPackageRepository {
  async create(ctx: TenantContext, input: CreatePublicationPackageInput): Promise<PublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.publication_packages
           (tenant_id, workspace_id, business_id, package_type, package_version,
            target_layer, target_block, data_reference, record_count, quality_score,
            reliability_score, schema_reference_id, provenance_reference_ids,
            limitations, status, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.businessId              ?? null,
          input.packageType,
          input.packageVersion          ?? '1.0',
          input.targetLayer,
          input.targetBlock,
          JSON.stringify(input.dataReference            ?? {}),
          input.recordCount,
          input.qualityScore            ?? null,
          input.reliabilityScore        ?? null,
          input.schemaReferenceId       ?? null,
          JSON.stringify(input.provenanceReferenceIds   ?? []),
          JSON.stringify(input.limitations              ?? []),
          input.status                  ?? 'draft',
          input.correlationId           ?? null,
          input.createdBy               ?? null,
        ]
      );
      return rowToPackage(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<PublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.publication_packages WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('PublicationPackage', id);
      return rowToPackage(result.rows[0]);
    });
  }

  async publish(ctx: TenantContext, id: string): Promise<PublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.publication_packages
         SET status = 'published', published_at = now()
         WHERE id = $1 AND status = 'ready'
         RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('PublicationPackage', id);
      return rowToPackage(result.rows[0]);
    });
  }

  async listByTargetLayer(ctx: TenantContext, targetLayer: string): Promise<PublicationPackage[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.publication_packages
         WHERE target_layer = $1
         ORDER BY created_at DESC`,
        [targetLayer]
      );
      return result.rows.map(rowToPackage);
    });
  }

  async revoke(ctx: TenantContext, id: string): Promise<PublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.publication_packages
         SET status = 'revoked'
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('PublicationPackage', id);
      return rowToPackage(result.rows[0]);
    });
  }
}
