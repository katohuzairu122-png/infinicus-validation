import { randomUUID } from 'crypto';
import type { PoolClient, QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, DuplicateSourceCodeError } from './errors.js';
import { runGuardedTransition } from './guards.js';
import { boundedPage } from './pagination.js';
import type { PageOptions } from './pagination.js';
import { emitSourceRegistered } from './outbox.js';

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

export { NotFoundError } from './errors.js';

function isUniqueViolation(err: unknown, constraint: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505'
    && 'constraint' in err && (err as { constraint: unknown }).constraint === constraint;
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
  /**
   * Registers a source and publishes da.source.registered.
   *
   * BUILD-31 §6.1 defines this as one transaction: the source row and the
   * outbox row commit together or not at all. A duplicate `sourceCode` within
   * the same tenant/workspace is translated into DuplicateSourceCodeError
   * (backed by data_sources_code_unique) rather than surfacing the raw
   * unique-violation to the caller.
   */
  async create(ctx: TenantContext, input: CreateDataSourceInput): Promise<DataSource> {
    return withTenantTransaction(ctx, async (client) => {
      let result: QueryResult<Record<string, unknown>>;
      try {
        result = await client.query(
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
      } catch (err) {
        if (isUniqueViolation(err, 'data_sources_code_unique')) {
          throw new DuplicateSourceCodeError(input.sourceCode);
        }
        throw err;
      }

      const source = rowToDataSource(result.rows[0]);

      // Correlation is read back from the persisted row rather than the
      // input, so the event carries the same correlation_id the source was
      // stored with even when the caller supplied none and the column
      // defaulted.
      await emitSourceRegistered(client, ctx, {
        sourceId:      source.id,
        sourceCode:    source.sourceCode,
        sourceType:    source.sourceType,
        correlationId: source.correlationId,
      });

      return source;
    });
  }

  /**
   * Duplicate-safe lookup by source code, scoped to the tenant/workspace
   * pair that data_sources_code_unique enforces. Returns null rather than
   * throwing when no source has this code, so callers can use it as a
   * pre-check without a try/catch.
   */
  async findBySourceCode(ctx: TenantContext, sourceCode: string): Promise<DataSource | null> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.data_sources
         WHERE source_code = $1 AND deleted_at IS NULL`,
        [sourceCode]
      );
      return result.rows.length > 0 ? rowToDataSource(result.rows[0]) : null;
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<DataSource> {
    return withTenantTransaction(
      ctx,
      (client) => this.findByIdOn(client, ctx, id)
    );
  }

  /**
   * findById() on a caller-supplied PoolClient.
   * Does not open or control a transaction; callers composing multiple
   * operations must supply the client from one outer withTenantTransaction().
   */
  async findByIdOn(
    client: PoolClient,
    ctx: TenantContext,
    id: string
  ): Promise<DataSource> {
    const result = await client.query<Record<string, unknown>>(
      'SELECT * FROM data_acquisition.data_sources WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) throw new NotFoundError('DataSource', id);
    return rowToDataSource(result.rows[0]);
  }

  /** @deprecated use listByBusiness — kept for existing callers outside BUILD-31. */
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

  /**
   * Lists a business's sources, newest first, bounded by BUILD-31 §4
   * pagination limits. `status` narrows to one status when supplied;
   * soft-deleted sources never appear regardless of status filter.
   */
  async listByBusiness(
    ctx: TenantContext,
    businessId: string,
    opts: { status?: string } & PageOptions = {}
  ): Promise<DataSource[]> {
    const { limit, offset } = boundedPage(opts);
    const conditions = ['business_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [businessId];
    if (opts.status) {
      params.push(opts.status);
      conditions.push(`status = $${params.length}`);
    }
    params.push(limit, offset);

    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.data_sources
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      return result.rows.map(rowToDataSource);
    });
  }

  /**
   * Sets the source's status under an optimistic concurrency guard — the
   * same compare-and-swap pattern ConnectorRepository.updateStatus uses.
   * This repository encodes no source-status lifecycle policy of its own;
   * the caller supplies the status it believes is persisted, and that
   * becomes the guard.
   *
   * @throws NotFoundError               source not visible to this tenant
   * @throws InvalidStateTransitionError status changed under us concurrently
   */
  async updateStatus(
    ctx: TenantContext,
    id: string,
    status: string
  ): Promise<DataSource> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<{ status: string }>(
        'SELECT status FROM data_acquisition.data_sources WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (current.rows.length === 0) {
        throw new NotFoundError('DataSource', id);
      }

      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.data_sources',
        stateColumn: 'status',
        entity:      'DataSource',
        id,
        expected:    [current.rows[0].status],
        next:        status,
        extraSet:    ['version = version + 1'],
      });

      return rowToDataSource(row);
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
