import { randomUUID } from 'crypto';
import type { QueryResult } from 'pg';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';
import { runGuardedTransition, statesAllowing } from './guards.js';
import { boundedPage } from './pagination.js';
import type { PageOptions } from './pagination.js';
import {
  emitCollectionStarted,
  emitCollectionCompleted,
  emitCollectionFailed,
} from './outbox.js';

/**
 * Collection-run states, mirroring collection_runs_state_check in
 * migration 0014_create_da_collection_runs.sql.
 */
export type CollectionRunState =
  | 'planned'
  | 'scheduled'
  | 'collecting'
  | 'collected'
  | 'validated'
  | 'published'
  | 'failed'
  | 'quarantined'
  | 'cancelled';

/**
 * The collection-run state machine frozen by BUILD-31 §4.6 (lines 611-629),
 * with the terminal states named at lines 641-645.
 *
 * Unlike the connector lifecycle — which BUILD-31 leaves undefined — every
 * edge here is specified by the frozen specification and is reproduced
 * verbatim:
 *
 *   planned      -> collecting     collected    -> validated
 *   scheduled    -> collecting     collected    -> quarantined
 *   collecting   -> collected      validated    -> published
 *   collecting   -> failed         validated    -> quarantined
 *   collecting   -> cancelled      quarantined  -> validated
 *
 * `published`, `failed`, and `cancelled` are terminal; their empty outbound
 * lists are what make "completing a failed run" and "publishing the same run
 * twice" unreachable rather than separately special-cased.
 *
 * Exported so tests can assert the implemented matrix against the frozen
 * specification directly, instead of inferring it from behaviour.
 */
export const COLLECTION_RUN_TRANSITIONS: Readonly<
  Record<CollectionRunState, readonly CollectionRunState[]>
> = Object.freeze({
  planned:     ['collecting'],
  scheduled:   ['collecting'],
  collecting:  ['collected', 'failed', 'cancelled'],
  collected:   ['validated', 'quarantined'],
  validated:   ['published', 'quarantined'],
  quarantined: ['validated'],
  published:   [],
  failed:      [],
  cancelled:   [],
});

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

  /**
   * Transitions the run to `collecting` and publishes da.collection.started.
   *
   * Legal from `planned` or `scheduled` only, so starting an already-started
   * run raises InvalidStateTransitionError instead of silently restarting it
   * and overwriting started_at.
   */
  async markStarted(ctx: TenantContext, id: string): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.collection_runs',
        stateColumn: 'state',
        entity:      'CollectionRun',
        id,
        expected:    statesAllowing(COLLECTION_RUN_TRANSITIONS, 'collecting'),
        next:        'collecting',
        extraSet:    ['started_at = now()'],
      });

      const run = rowToCollectionRun(row);

      // Correlation and causation are read back from the persisted row, so the
      // event carries the same trace ids the run was stored with.
      await emitCollectionStarted(client, ctx, {
        collectionRunId: run.id,
        sourceId:        run.dataSourceId,
        collectionType:  run.collectionType,
        correlationId:   run.correlationId,
        causationId:     run.causationId,
      });

      return run;
    });
  }

  /**
   * Transitions the run to `collected` and publishes da.collection.completed.
   *
   * Legal from `collecting` only, so completing a failed, cancelled, or
   * already-completed run raises InvalidStateTransitionError.
   */
  async markCompleted(
    ctx: TenantContext,
    id: string,
    input: CompleteCollectionRunInput
  ): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.collection_runs',
        stateColumn: 'state',
        entity:      'CollectionRun',
        id,
        expected:    statesAllowing(COLLECTION_RUN_TRANSITIONS, 'collected'),
        next:        'collected',
        // extraValues bind $3..$7; the expected-state array lands on $8.
        extraSet: [
          'completed_at      = now()',
          'records_received  = $3',
          'records_accepted  = $4',
          'records_rejected  = $5',
          'bytes_received    = $6',
          'response_metadata = $7',
        ],
        extraValues: [
          input.recordsReceived,
          input.recordsAccepted,
          input.recordsRejected,
          input.bytesReceived,
          JSON.stringify(input.responseMetadata ?? {}),
        ],
      });

      const run = rowToCollectionRun(row);

      // bytesReceived is deliberately absent: emit_collection_completed in
      // migration 0022 takes only the three record counts.
      await emitCollectionCompleted(client, ctx, {
        collectionRunId: run.id,
        sourceId:        run.dataSourceId,
        recordsReceived: run.recordsReceived,
        recordsAccepted: run.recordsAccepted,
        recordsRejected: run.recordsRejected,
        correlationId:   run.correlationId,
        causationId:     run.causationId,
      });

      return run;
    });
  }

  /**
   * Transitions the run to `failed` and publishes da.collection.failed.
   *
   * Legal from `collecting` only. The emission runs on the same client inside
   * the same transaction, so a persisted failure without its event — or an
   * event without the persisted failure — is unreachable.
   */
  async markFailed(
    ctx: TenantContext,
    id: string,
    errorCode: string,
    errorMessage: string
  ): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.collection_runs',
        stateColumn: 'state',
        entity:      'CollectionRun',
        id,
        expected:    statesAllowing(COLLECTION_RUN_TRANSITIONS, 'failed'),
        next:        'failed',
        // extraValues bind $3..$4; the expected-state array lands on $5.
        extraSet: [
          'completed_at  = now()',
          'error_code    = $3',
          'error_message = $4',
        ],
        extraValues: [errorCode, errorMessage],
      });

      const run = rowToCollectionRun(row);

      // errorMessage is deliberately absent: emit_collection_failed in
      // migration 0022 takes only the error code.
      await emitCollectionFailed(client, ctx, {
        collectionRunId: run.id,
        sourceId:        run.dataSourceId,
        errorCode,
        correlationId:   run.correlationId,
        causationId:     run.causationId,
      });

      return run;
    });
  }

  /**
   * Transitions the run to `cancelled`. Legal from `collecting` only.
   *
   * Emits nothing: migration 0022 defines no cancellation wrapper, and
   * BUILD-31 forbids introducing event types the SQL layer does not already
   * support. `completed_at` is stamped because cancellation ends the run.
   */
  async markCancelled(ctx: TenantContext, id: string): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.collection_runs',
        stateColumn: 'state',
        entity:      'CollectionRun',
        id,
        expected:    statesAllowing(COLLECTION_RUN_TRANSITIONS, 'cancelled'),
        next:        'cancelled',
        extraSet:    ['completed_at = now()'],
      });
      return rowToCollectionRun(row);
    });
  }

  /**
   * Transitions the run to `validated`. Legal from `collected`, or from
   * `quarantined` — the remediation path frozen by BUILD-31 §4.6.
   *
   * Emits nothing. da.validation.completed carries a validation_result_id and
   * the error/warning counts of a specific validation_results row; those are
   * facts this repository does not hold, and ValidationResultRepository owns
   * that aggregate. Emitting here would duplicate the event and require
   * fabricating its payload.
   *
   * No timestamp column exists for this transition, so nothing besides the
   * state changes.
   */
  async markValidated(ctx: TenantContext, id: string): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.collection_runs',
        stateColumn: 'state',
        entity:      'CollectionRun',
        id,
        expected:    statesAllowing(COLLECTION_RUN_TRANSITIONS, 'validated'),
        next:        'validated',
      });
      return rowToCollectionRun(row);
    });
  }

  /**
   * Transitions the run to `quarantined`. Legal from `collected` or
   * `validated`.
   *
   * Emits nothing. da.data.quarantined does use `collection_run` as its
   * aggregate, but its payload is a recordReference and reason describing one
   * quarantined record inside the run — a different fact from the run itself
   * entering quarantine. Reusing it here would misrepresent the event and
   * require inventing a record reference.
   */
  async markQuarantined(ctx: TenantContext, id: string): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.collection_runs',
        stateColumn: 'state',
        entity:      'CollectionRun',
        id,
        expected:    statesAllowing(COLLECTION_RUN_TRANSITIONS, 'quarantined'),
        next:        'quarantined',
      });
      return rowToCollectionRun(row);
    });
  }

  /**
   * Transitions the run to `published`. Legal from `validated` only, so
   * publishing an unvalidated run — or the same run twice, `published` being
   * terminal — raises InvalidStateTransitionError.
   *
   * Emits nothing. da.data.published is keyed to a publication_package with a
   * target layer, target block, and record count; PublicationPackageRepository
   * owns that aggregate and that event.
   *
   * `completed_at` is deliberately left alone: it already records when
   * collection finished, and overwriting it here would destroy that fact.
   */
  async markPublished(ctx: TenantContext, id: string): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const row = await runGuardedTransition(client, {
        table:       'data_acquisition.collection_runs',
        stateColumn: 'state',
        entity:      'CollectionRun',
        id,
        expected:    statesAllowing(COLLECTION_RUN_TRANSITIONS, 'published'),
        next:        'published',
      });
      return rowToCollectionRun(row);
    });
  }

  /**
   * Lists runs for one data source, newest first.
   *
   * BUILD-31 §4 requires every list to be bounded, so `page` is clamped
   * through boundedPage; omitting it yields DEFAULT_PAGE_SIZE rather than an
   * unbounded scan. Tenant and workspace confinement comes from RLS via
   * withTenantTransaction, not from a hand-written predicate.
   *
   * Backed by idx_da_runs_source (tenant_id, data_source_id, created_at DESC).
   */
  async listBySource(
    ctx: TenantContext,
    dataSourceId: string,
    page: PageOptions = {}
  ): Promise<CollectionRun[]> {
    const { limit, offset } = boundedPage(page);

    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.collection_runs
         WHERE data_source_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [dataSourceId, limit, offset]
      );
      return result.rows.map(rowToCollectionRun);
    });
  }

  /**
   * Lists runs for one business, newest first, under the same page bounds.
   *
   * idx_da_runs_business covers the business_id filter but not the ordering,
   * so the matched rows are sorted. business_id is nullable, and a NULL never
   * matches `= $1`, so unattributed runs are correctly excluded.
   */
  async listByBusiness(
    ctx: TenantContext,
    businessId: string,
    page: PageOptions = {}
  ): Promise<CollectionRun[]> {
    const { limit, offset } = boundedPage(page);

    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM data_acquisition.collection_runs
         WHERE business_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [businessId, limit, offset]
      );
      return result.rows.map(rowToCollectionRun);
    });
  }

  /**
   * Replaces the run's request metadata.
   *
   * Not a lifecycle transition — BUILD-31 constrains no state for it — so it
   * is deliberately not routed through runGuardedTransition and touches no
   * state column. A row invisible to this tenant raises NotFoundError.
   */
  async updateRequestMetadata(
    ctx: TenantContext,
    id: string,
    requestMetadata: Record<string, unknown>
  ): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.collection_runs
         SET request_metadata = $2
         WHERE id = $1
         RETURNING *`,
        [id, JSON.stringify(requestMetadata)]
      );
      if (result.rows.length === 0) throw new NotFoundError('CollectionRun', id);
      return rowToCollectionRun(result.rows[0]);
    });
  }

  /**
   * Replaces the run's resumption checkpoint. Not a lifecycle transition, so
   * no state column is touched and no guard applies.
   */
  async updateCheckpoint(
    ctx: TenantContext,
    id: string,
    checkpoint: Record<string, unknown>
  ): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.collection_runs
         SET checkpoint = $2
         WHERE id = $1
         RETURNING *`,
        [id, JSON.stringify(checkpoint)]
      );
      if (result.rows.length === 0) throw new NotFoundError('CollectionRun', id);
      return rowToCollectionRun(result.rows[0]);
    });
  }

  /**
   * Increments attempt_number by exactly one.
   *
   * BUILD-31 §4.7 requires the retry counter to move only through an explicit
   * method, so no other operation on this repository writes attempt_number.
   * The increment is computed in SQL rather than read-modify-written, so two
   * concurrent retries cannot lose a count.
   */
  async incrementRetryAttempt(
    ctx: TenantContext,
    id: string
  ): Promise<CollectionRun> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE data_acquisition.collection_runs
         SET attempt_number = attempt_number + 1
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('CollectionRun', id);
      return rowToCollectionRun(result.rows[0]);
    });
  }
}
