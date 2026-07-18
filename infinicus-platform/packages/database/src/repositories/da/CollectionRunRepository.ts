import { randomUUID } from 'crypto';
import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './DataSourceRepository.js';

export interface CollectionRun {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  dataSourceId: string;
  connectorId: string | null;
  scheduleId: string | null;
  collectionType: string;
  state: string;
  startedAt: Date | null;
  completedAt: Date | null;
  checkpoint: Record<string, unknown>;
  requestMetadata: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
  recordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  bytesReceived: number;
  errorCode: string | null;
  errorMessage: string | null;
  attemptNumber: number;
  correlationId: string;
  causationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateCollectionRunInput {
  businessId?: string;
  dataSourceId: string;
  connectorId?: string;
  scheduleId?: string;
  collectionType: string;
  correlationId?: string;
  causationId?: string;
  createdBy?: string;
}

export interface CompleteCollectionRunInput {
  recordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  bytesReceived: number;
  responseMetadata?: Record<string, unknown>;
}

function rowToCollectionRun(row: Record<string, unknown>): CollectionRun {
  return {
    id:               row.id                as string,
    tenantId:         row.tenant_id         as string,
    workspaceId:      row.workspace_id      as string,
    businessId:       row.business_id       as string | null,
    dataSourceId:     row.data_source_id    as string,
    connectorId:      row.connector_id      as string | null,
    scheduleId:       row.schedule_id       as string | null,
    collectionType:   row.collection_type   as string,
    state:            row.state             as string,
    startedAt:        row.started_at        as Date | null,
    completedAt:      row.completed_at      as Date | null,
    checkpoint:       row.checkpoint        as Record<string, unknown>,
    requestMetadata:  row.request_metadata  as Record<string, unknown>,
    responseMetadata: row.response_metadata as Record<string, unknown>,
    recordsReceived:  row.records_received  as number,
    recordsAccepted:  row.records_accepted  as number,
    recordsRejected:  row.records_rejected  as number,
    bytesReceived:    Number(row.bytes_received),
    errorCode:        row.error_code        as string | null,
    errorMessage:     row.error_message     as string | null,
    attemptNumber:    row.attempt_number    as number,
    correlationId:    row.correlation_id    as string,
    causationId:      row.causation_id      as string | null,
    createdAt:        row.created_at        as Date,
    updatedAt:        row.updated_at        as Date,
    createdBy:        row.created_by        as string | null,
  };
}

export class CollectionRunRepository {
  async create(ctx: TenantContext, input: CreateCollectionRunInput): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result: QueryResult<Record<string, unknown>> = await client.query(
        `INSERT INTO data_acquisition.collection_runs
           (tenant_id, workspace_id, business_id, data_source_id, connector_id,
            schedule_id, collection_type, state, correlation_id, causation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'planned',$8,$9,$10)
         RETURNING *`,
        [
          ctx.tenantId,
          ctx.workspaceId,
          input.businessId   ?? null,
          input.dataSourceId,
          input.connectorId  ?? null,
          input.scheduleId   ?? null,
          input.collectionType,
          input.correlationId ?? randomUUID(),
          input.causationId   ?? null,
          input.createdBy     ?? null,
        ]
      );
      return rowToCollectionRun(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM data_acquisition.collection_runs WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('CollectionRun', id);
      return rowToCollectionRun(result.rows[0]);
    });
  }

  async markStarted(ctx: TenantContext, id: string): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.collection_runs
         SET state = 'collecting', started_at = now()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('CollectionRun', id);
      return rowToCollectionRun(result.rows[0]);
    });
  }

  async markCompleted(
    ctx: TenantContext,
    id: string,
    input: CompleteCollectionRunInput
  ): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.collection_runs
         SET state = 'collected',
             completed_at      = now(),
             records_received  = $2,
             records_accepted  = $3,
             records_rejected  = $4,
             bytes_received    = $5,
             response_metadata = $6
         WHERE id = $1
         RETURNING *`,
        [
          id,
          input.recordsReceived,
          input.recordsAccepted,
          input.recordsRejected,
          input.bytesReceived,
          JSON.stringify(input.responseMetadata ?? {}),
        ]
      );
      if (result.rows.length === 0) throw new NotFoundError('CollectionRun', id);
      return rowToCollectionRun(result.rows[0]);
    });
  }

  async markFailed(
    ctx: TenantContext,
    id: string,
    errorCode: string,
    errorMessage: string
  ): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.collection_runs
         SET state = 'failed', completed_at = now(),
             error_code = $2, error_message = $3
         WHERE id = $1
         RETURNING *`,
        [id, errorCode, errorMessage]
      );
      if (result.rows.length === 0) throw new NotFoundError('CollectionRun', id);
      return rowToCollectionRun(result.rows[0]);
    });
  }
}
