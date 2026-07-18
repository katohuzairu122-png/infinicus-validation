import { randomUUID } from 'crypto';
import type { PoolClient, QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';

export interface DataSource {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  name: string;
  sourceCode: string;
  sourceType: string;
  ownerType: string | null;
  ownerId: string | null;
  accessMode: string | null;
  jurisdiction: string | null;
  sensitivityLevel: string;
  description: string | null;
  configuration: Record<string, unknown>;
  status: string;
  version: number;
  sourceSystem: string;
  sourceRecordId: string | null;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  deletedAt: Date | null;
}

export interface CreateDataSourceInput {
  businessId?: string;
  name: string;
  sourceCode: string;
  sourceType: string;
  ownerType?: string;
  ownerId?: string;
  accessMode?: string;
  jurisdiction?: string;
  sensitivityLevel?: string;
  description?: string;
  configuration?: Record<string, unknown>;
  status?: string;
  correlationId?: string;
  createdBy?: string;
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

function rowToDataSource(row: Record<string, unknown>): DataSource {
  return {
    id:               row.id               as string,
    tenantId:         row.tenant_id        as string,
    workspaceId:      row.workspace_id     as string,
    businessId:       row.business_id      as string | null,
    name:             row.name             as string,
    sourceCode:       row.source_code      as string,
    sourceType:       row.source_type      as string,
    ownerType:        row.owner_type       as string | null,
    ownerId:          row.owner_id         as string | null,
    accessMode:       row.access_mode      as string | null,
    jurisdiction:     row.jurisdiction     as string | null,
    sensitivityLevel: row.sensitivity_level as string,
    description:      row.description      as string | null,
    configuration:    row.configuration    as Record<string, unknown>,
    status:           row.status           as string,
    version:          row.version          as number,
    sourceSystem:     row.source_system    as string,
    sourceRecordId:   row.source_record_id as string | null,
    correlationId:    row.correlation_id   as string,
    createdAt:        row.created_at       as Date,
    updatedAt:        row.updated_at       as Date,
    createdBy:        row.created_by       as string | null,
    deletedAt:        row.deleted_at       as Date | null,
  };
}

export class DataSourceRepository {
  async create(ctx: TenantContext, input: CreateDataSourceInput): Promise<DataSource> {
    return withTenantTransaction(ctx, async (client) => {
      const result: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.data_sources
           (tenant_id, workspace_id, business_id, name, source_code, source_type,
            owner_type, owner_id, access_mode, jurisdiction, sensitivity_level,
            description, configuration, status, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.businessId       ?? null,
          input.name,
          input.sourceCode,
          input.sourceType,
          input.ownerType        ?? null,
          input.ownerId          ?? null,
          input.accessMode       ?? null,
          input.jurisdiction     ?? null,
          input.sensitivityLevel ?? 'internal',
          input.description      ?? null,
          JSON.stringify(input.configuration ?? {}),
          input.status           ?? 'draft',
          input.correlationId    ?? randomUUID(),
          input.createdBy        ?? null,
        ]
      );
      return rowToDataSource(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<DataSource> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.data_sources WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('DataSource', id);
      return rowToDataSource(result.rows[0]);
    });
  }

  async listActive(ctx: TenantContext): Promise<DataSource[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.data_sources
         WHERE status = 'active' AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        []
      );
      return result.rows.map(rowToDataSource);
    });
  }

  async updateStatus(
    ctx: TenantContext,
    id: string,
    status: string
  ): Promise<DataSource> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.data_sources
         SET status = $2, version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, status]
      );
      if (result.rows.length === 0) throw new NotFoundError('DataSource', id);
      return rowToDataSource(result.rows[0]);
    });
  }

  async softDelete(ctx: TenantContext, id: string): Promise<void> {
    return withTenantTransaction(ctx, async (client: PoolClient) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.data_sources
         SET deleted_at = now(), status = 'retired', version = version + 1
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('DataSource', id);
    });
  }
}
