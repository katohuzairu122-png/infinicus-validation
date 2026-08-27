import { randomUUID } from 'crypto';
import type { PoolClient, QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './DataSourceRepository.js';
import { runGuardedTransition, statesAllowing } from './guards.js';
import { boundedPage } from './pagination.js';
import type { PageOptions } from './pagination.js';
import { emitDataPublished } from './outbox.js';
import { CollectionRunRepository } from './CollectionRunRepository.js';

/**
 * Publication-package states, mirroring publication_packages_status_check
 * in migration 0019_create_da_publication_deployment.sql.
 */
export type PublicationPackageStatus = 'draft' | 'ready' | 'published' | 'revoked';

/**
 * BUILD-31 §4.7/§4.12/§4.13 legal transitions. Unlike the collection-run
 * state machine, BUILD-31 does not freeze a full matrix for publication
 * packages — it specifies three edges explicitly ("transition draft to
 * ready", "publish only from ready", "revoke only from allowed states") and
 * this module reproduces exactly those, choosing the narrowest reasonable
 * reading of "allowed states" for revoke: a package that never became
 * `ready` has nothing to revoke, so only `ready` and `published` may move
 * to `revoked`.
 */
export const PUBLICATION_PACKAGE_TRANSITIONS: Readonly<
  Record<PublicationPackageStatus, readonly PublicationPackageStatus[]>
> = Object.freeze({
  draft:     ['ready'],
  ready:     ['published', 'revoked'],
  published: ['revoked'],
  revoked:   [],
});

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

const collectionRuns = new CollectionRunRepository();

export class PublicationPackageRepository {
  async create(ctx: TenantContext, input: CreatePublicationPackageInput): Promise<PublicationPackage> {
    return withTenantTransaction(
      ctx,
      (client) => this.createOn(client, ctx, input)
    );
  }

  /**
   * create() on a caller-supplied PoolClient.
   * Does not open or control a transaction; callers composing multiple
   * operations must supply the client from one outer withTenantTransaction().
   */
  async createOn(
    client: PoolClient,
    ctx: TenantContext,
    input: CreatePublicationPackageInput
  ): Promise<PublicationPackage> {
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
        input.correlationId           ?? randomUUID(),
        input.createdBy               ?? null,
      ]
    );
    return rowToPackage(result.rows[0]);
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

  /**
   * Lists publication packages for one business, newest first, bounded by
   * BUILD-31 §4.14 pagination limits. `status` narrows to one status when
   * supplied. Backs GET /data-acquisition/publication-packages.
   */
  async listByBusinessAndStatus(
    ctx: TenantContext,
    businessId: string,
    opts: { status?: PublicationPackageStatus } & PageOptions = {}
  ): Promise<PublicationPackage[]> {
    const { limit, offset } = boundedPage(opts);
    const conditions = ['business_id = $1'];
    const params: unknown[] = [businessId];
    if (opts.status) {
      params.push(opts.status);
      conditions.push(`status = $${params.length}`);
    }
    params.push(limit, offset);

    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.publication_packages
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      return result.rows.map(rowToPackage);
    });
  }

  /** @deprecated use listByBusinessAndStatus — kept for existing callers outside BUILD-31. */
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

  /**
   * Transitions the package from `draft` to `ready`.
   *
   * @throws NotFoundError               package not visible to this tenant
   * @throws InvalidStateTransitionError package is not in `draft`
   */
  async markReady(ctx: TenantContext, id: string): Promise<PublicationPackage> {
    return withTenantTransaction(
      ctx,
      (client) => this.markReadyOn(client, id)
    );
  }

  /**
   * markReady() on a caller-supplied PoolClient — lets
   * DataAcquisitionService.preparePublicationPackage create the package and
   * transition it to `ready` in one atomic transaction.
   */
  async markReadyOn(client: PoolClient, id: string): Promise<PublicationPackage> {
    const row = await runGuardedTransition(client, {
      table:       'data_acquisition.publication_packages',
      stateColumn: 'status',
      entity:      'PublicationPackage',
      id,
      expected:    statesAllowing(PUBLICATION_PACKAGE_TRANSITIONS, 'ready'),
      next:        'ready',
    });
    return rowToPackage(row);
  }

  /**
   * publish() opening its own transaction. See publishOn for the atomicity
   * this delegates to. `publication_packages` has no collection_run_id
   * column (verified against 0019_create_da_publication_deployment.sql), so
   * the caller — which prepared this package from a specific run — supplies
   * it explicitly rather than this repository inferring it.
   */
  async publish(
    ctx: TenantContext,
    id: string,
    collectionRunId: string
  ): Promise<PublicationPackage> {
    return withTenantTransaction(
      ctx,
      (client) => this.publishOn(client, ctx, id, collectionRunId)
    );
  }

  /**
   * Transitions the package to `published`, transitions its collection run
   * to `published`, and emits da.data.published — all inside one caller
   * transaction, per BUILD-31 §6.7's atomicity requirement.
   *
   * Runs on the caller's client rather than opening its own transaction, so
   * DataAcquisitionService composes this with whatever readiness checks
   * (quality threshold, business-operations delivery) it performs around it.
   *
   * @throws NotFoundError               package not visible to this tenant
   * @throws InvalidStateTransitionError package is not `ready`, or its run
   *                                     is not `validated`
   */
  async publishOn(
    client: PoolClient,
    ctx: TenantContext,
    id: string,
    collectionRunId: string
  ): Promise<PublicationPackage> {
    const row = await runGuardedTransition(client, {
      table:       'data_acquisition.publication_packages',
      stateColumn: 'status',
      entity:      'PublicationPackage',
      id,
      expected:    statesAllowing(PUBLICATION_PACKAGE_TRANSITIONS, 'published'),
      next:        'published',
      extraSet:    ['published_at = now()'],
    });
    const pkg = rowToPackage(row);

    await collectionRuns.markPublishedOn(client, ctx, collectionRunId);

    await emitDataPublished(client, ctx, {
      packageId:     pkg.id,
      targetLayer:   pkg.targetLayer,
      targetBlock:   pkg.targetBlock,
      recordCount:   pkg.recordCount,
      correlationId: pkg.correlationId,
    });

    return pkg;
  }

  /**
   * Transitions the package to `revoked`. Legal from `ready` or `published`
   * only — see PUBLICATION_PACKAGE_TRANSITIONS for why `draft` is excluded.
   *
   * @throws NotFoundError               package not visible to this tenant
   * @throws InvalidStateTransitionError package is `draft` or already `revoked`
   */
  async revoke(ctx: TenantContext, id: string): Promise<PublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.publication_packages',
        stateColumn: 'status',
        entity:      'PublicationPackage',
        id,
        expected:    statesAllowing(PUBLICATION_PACKAGE_TRANSITIONS, 'revoked'),
        next:        'revoked',
      });
      return rowToPackage(row);
    });
  }
}
