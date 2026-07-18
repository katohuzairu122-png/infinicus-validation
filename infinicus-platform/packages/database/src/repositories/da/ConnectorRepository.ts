import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './DataSourceRepository.js';

export interface Connector {
  id: string;
  tenantId: string;
  workspaceId: string;
  dataSourceId: string;
  name: string;
  connectorType: string;
  protocol: string | null;
  connectorVersion: string;
  capabilities: Record<string, unknown>;
  configurationReference: string | null;
  healthStatus: string;
  lastHealthCheckAt: Date | null;
  status: string;
  version: number;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  deletedAt: Date | null;
}

export interface CreateConnectorInput {
  dataSourceId: string;
  name: string;
  connectorType: string;
  protocol?: string;
  connectorVersion?: string;
  capabilities?: Record<string, unknown>;
  configurationReference?: string;
  status?: string;
  correlationId?: string;
  createdBy?: string;
}

function rowToConnector(row: Record<string, unknown>): Connector {
  return {
    id:                     row.id                       as string,
    tenantId:               row.tenant_id                as string,
    workspaceId:            row.workspace_id             as string,
    dataSourceId:           row.data_source_id           as string,
    name:                   row.name                     as string,
    connectorType:          row.connector_type           as string,
    protocol:               row.protocol                 as string | null,
    connectorVersion:       row.connector_version        as string,
    capabilities:           row.capabilities             as Record<string, unknown>,
    configurationReference: row.configuration_reference  as string | null,
    healthStatus:           row.health_status            as string,
    lastHealthCheckAt:      row.last_health_check_at     as Date | null,
    status:                 row.status                   as string,
    version:                row.version                  as number,
    correlationId:          row.correlation_id           as string,
    createdAt:              row.created_at               as Date,
    updatedAt:              row.updated_at               as Date,
    createdBy:              row.created_by               as string | null,
    deletedAt:              row.deleted_at               as Date | null,
  };
}

export class ConnectorRepository {
  async create(ctx: TenantContext, input: CreateConnectorInput): Promise<Connector> {
    return withTenantTransaction(ctx, async (client) => {
      const result: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.connectors
           (tenant_id, workspace_id, data_source_id, name, connector_type,
            protocol, connector_version, capabilities, configuration_reference,
            status, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.dataSourceId,
          input.name,
          input.connectorType,
          input.protocol              ?? null,
          input.connectorVersion      ?? '1.0',
          JSON.stringify(input.capabilities ?? {}),
          input.configurationReference ?? null,
          input.status                ?? 'draft',
          input.correlationId         ?? null,
          input.createdBy             ?? null,
        ]
      );
      return rowToConnector(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<Connector> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.connectors WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('Connector', id);
      return rowToConnector(result.rows[0]);
    });
  }

  async listByDataSource(ctx: TenantContext, dataSourceId: string): Promise<Connector[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.connectors
         WHERE data_source_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [dataSourceId]
      );
      return result.rows.map(rowToConnector);
    });
  }

  async updateHealth(
    ctx: TenantContext,
    id: string,
    healthStatus: string
  ): Promise<Connector> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.connectors
         SET health_status = $2, last_health_check_at = now(), version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, healthStatus]
      );
      if (result.rows.length === 0) throw new NotFoundError('Connector', id);
      return rowToConnector(result.rows[0]);
    });
  }
}
