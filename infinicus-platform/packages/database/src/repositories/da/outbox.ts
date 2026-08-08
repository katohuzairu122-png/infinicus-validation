/**
 * Transactional outbox emission for the Data Acquisition persistence layer.
 *
 * BUILD-31 §4.9 requires that a DA domain write and its published event either
 * both commit or neither does. The SQL wrappers in migration
 * 0022_create_da_triggers_events.sql already insert into events.outbox_events
 * inside the caller's transaction; this module is the typed TypeScript surface
 * over exactly those wrappers, so repositories never hand-write the SELECT.
 *
 * Design rules this module holds to:
 *
 *   1. Every function below maps 1:1 onto a wrapper that already exists in
 *      migration 0022. No new event types are introduced here.
 *   2. The caller's PoolClient is used directly. Nothing in this module opens
 *      a transaction, commits, or rolls back — emission therefore lands in the
 *      same transaction as the domain write that triggered it.
 *   3. Every value is bound as a query parameter. No value is interpolated
 *      into SQL text.
 *   4. The SQL strings are module-local constants. No function name is ever
 *      assembled from caller input, so a caller cannot steer emission at a
 *      function it was not given an explicit typed entry point for.
 *   5. There is deliberately no generic "emit any event" export. Adding a DA
 *      event means adding a wrapper in a migration and a typed function here.
 *
 * Context handling — the wrappers take tenant, workspace, correlation,
 * causation, and the aggregate identity, and nothing else:
 *
 *   tenant / workspace  passed explicitly from TenantContext, and additionally
 *                       enforced by RLS via the app.tenant_id / app.workspace_id
 *                       GUCs that withTenantTransaction sets on this client.
 *   correlation         passed explicitly per event; repositories forward the
 *                       correlation_id already stored on the domain row so the
 *                       event and the record share one trace.
 *   causation           passed explicitly where the wrapper accepts it. Two
 *                       wrappers (source.registered, connector.registered) have
 *                       no causation parameter because they open a chain rather
 *                       than continue one, so their input types omit it.
 *   actor               not a wrapper parameter. It travels as the app.user_id
 *                       GUC set by withTenantTransaction on this same client
 *                       and is read by the audit triggers.
 *   business            not a wrapper parameter. It is a column on the DA
 *                       domain row (e.g. data_sources.business_id) and is
 *                       resolved from the aggregate id carried in the payload.
 *   aggregate           set by each wrapper itself — every wrapper passes an
 *                       explicit aggregate_type and aggregate_id through to
 *                       data_acquisition.emit_outbox_event, so callers must not
 *                       and cannot override it.
 */

import type { PoolClient } from 'pg';
import type { TenantContext } from '../../client.js';

/** Id of the row written into events.outbox_events. */
export type OutboxEventId = string;

/**
 * SQL for each DA wrapper, as fixed module-local constants.
 *
 * These are the only statements this module ever executes. They are frozen and
 * never built by concatenation, so the set of events reachable through this
 * module is closed at compile time.
 */
const SQL = Object.freeze({
  sourceRegistered:
    'SELECT data_acquisition.emit_source_registered($1,$2,$3,$4,$5,$6) AS event_id',
  connectorRegistered:
    'SELECT data_acquisition.emit_connector_registered($1,$2,$3,$4,$5,$6) AS event_id',
  collectionStarted:
    'SELECT data_acquisition.emit_collection_started($1,$2,$3,$4,$5,$6,$7) AS event_id',
  collectionCompleted:
    'SELECT data_acquisition.emit_collection_completed($1,$2,$3,$4,$5,$6,$7,$8,$9) AS event_id',
  collectionFailed:
    'SELECT data_acquisition.emit_collection_failed($1,$2,$3,$4,$5,$6,$7) AS event_id',
  validationCompleted:
    'SELECT data_acquisition.emit_validation_completed($1,$2,$3,$4,$5,$6,$7,$8,$9) AS event_id',
  dataQuarantined:
    'SELECT data_acquisition.emit_data_quarantined($1,$2,$3,$4,$5,$6,$7) AS event_id',
  dataQualityScored:
    'SELECT data_acquisition.emit_data_quality_scored($1,$2,$3,$4,$5,$6,$7) AS event_id',
  dataPublished:
    'SELECT data_acquisition.emit_data_published($1,$2,$3,$4,$5,$6,$7,$8) AS event_id',
} as const);

/**
 * Runs one wrapper and returns the id of the row it inserted.
 *
 * Not exported. `sql` is always one of the SQL constants above, chosen by the
 * typed function that calls this — never by a caller — which is what keeps
 * rule 4 and rule 5 true. Every element of `values` is bound as a parameter.
 *
 * A wrapper that returned no row would mean the migration is not the one this
 * module was written against, so that is surfaced as an error rather than
 * returned as an undefined id.
 */
async function callWrapper(
  client: PoolClient,
  sql: string,
  values: readonly unknown[],
): Promise<OutboxEventId> {
  const result = await client.query<{ event_id: string }>(sql, [...values]);

  if (result.rows.length === 0 || result.rows[0].event_id === null) {
    throw new Error(
      'Data Acquisition outbox wrapper returned no event id; ' +
        'expected migration 0022_create_da_triggers_events.sql to be applied',
    );
  }

  return result.rows[0].event_id;
}

// ── da.source.registered ─────────────────────────────────────────────────────

export interface SourceRegisteredEvent {
  /** Aggregate: data_acquisition.data_sources.id */
  sourceId: string;
  sourceCode: string;
  sourceType: string;
  /** correlation_id stored on the data_sources row. */
  correlationId: string;
}

/**
 * Emits da.source.registered (aggregate `data_source`).
 *
 * No causation parameter: registering a source starts a trace rather than
 * continuing one, and the wrapper's signature has no p_causation_id.
 */
export async function emitSourceRegistered(
  client: PoolClient,
  ctx: TenantContext,
  event: SourceRegisteredEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.sourceRegistered, [
    ctx.tenantId,
    ctx.workspaceId,
    event.sourceId,
    event.sourceCode,
    event.sourceType,
    event.correlationId,
  ]);
}

// ── da.connector.registered ──────────────────────────────────────────────────

export interface ConnectorRegisteredEvent {
  /** Aggregate: data_acquisition.connectors.id */
  connectorId: string;
  sourceId: string;
  connectorType: string;
  correlationId: string;
}

/**
 * Emits da.connector.registered (aggregate `connector`).
 *
 * No causation parameter, for the same reason as source.registered.
 */
export async function emitConnectorRegistered(
  client: PoolClient,
  ctx: TenantContext,
  event: ConnectorRegisteredEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.connectorRegistered, [
    ctx.tenantId,
    ctx.workspaceId,
    event.connectorId,
    event.sourceId,
    event.connectorType,
    event.correlationId,
  ]);
}

// ── da.collection.started ────────────────────────────────────────────────────

export interface CollectionStartedEvent {
  /** Aggregate: data_acquisition.collection_runs.id */
  collectionRunId: string;
  sourceId: string;
  collectionType: string;
  correlationId: string;
  /** Event that caused this run to start, when there is one. */
  causationId?: string | null;
}

/** Emits da.collection.started (aggregate `collection_run`). */
export async function emitCollectionStarted(
  client: PoolClient,
  ctx: TenantContext,
  event: CollectionStartedEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.collectionStarted, [
    ctx.tenantId,
    ctx.workspaceId,
    event.collectionRunId,
    event.sourceId,
    event.collectionType,
    event.correlationId,
    event.causationId ?? null,
  ]);
}

// ── da.collection.completed ──────────────────────────────────────────────────

export interface CollectionCompletedEvent {
  /** Aggregate: data_acquisition.collection_runs.id */
  collectionRunId: string;
  sourceId: string;
  recordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  correlationId: string;
  causationId?: string | null;
}

/** Emits da.collection.completed (aggregate `collection_run`). */
export async function emitCollectionCompleted(
  client: PoolClient,
  ctx: TenantContext,
  event: CollectionCompletedEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.collectionCompleted, [
    ctx.tenantId,
    ctx.workspaceId,
    event.collectionRunId,
    event.sourceId,
    event.recordsReceived,
    event.recordsAccepted,
    event.recordsRejected,
    event.correlationId,
    event.causationId ?? null,
  ]);
}

// ── da.collection.failed ─────────────────────────────────────────────────────

export interface CollectionFailedEvent {
  /** Aggregate: data_acquisition.collection_runs.id */
  collectionRunId: string;
  sourceId: string;
  errorCode: string;
  correlationId: string;
  causationId?: string | null;
}

/**
 * Emits da.collection.failed (aggregate `collection_run`).
 *
 * Emit this inside the transaction that records the failure on the run row. It
 * must not be emitted from a catch block that has already rolled back, or the
 * event is discarded with the rollback.
 */
export async function emitCollectionFailed(
  client: PoolClient,
  ctx: TenantContext,
  event: CollectionFailedEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.collectionFailed, [
    ctx.tenantId,
    ctx.workspaceId,
    event.collectionRunId,
    event.sourceId,
    event.errorCode,
    event.correlationId,
    event.causationId ?? null,
  ]);
}

// ── da.validation.completed ──────────────────────────────────────────────────

export interface ValidationCompletedEvent {
  /** Aggregate: data_acquisition.validation_results.id */
  validationResultId: string;
  collectionRunId: string;
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  correlationId: string;
  causationId?: string | null;
}

/** Emits da.validation.completed (aggregate `validation_result`). */
export async function emitValidationCompleted(
  client: PoolClient,
  ctx: TenantContext,
  event: ValidationCompletedEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.validationCompleted, [
    ctx.tenantId,
    ctx.workspaceId,
    event.validationResultId,
    event.collectionRunId,
    event.isValid,
    event.errorCount,
    event.warningCount,
    event.correlationId,
    event.causationId ?? null,
  ]);
}

// ── da.data.quarantined ──────────────────────────────────────────────────────

export interface DataQuarantinedEvent {
  /** Aggregate: data_acquisition.collection_runs.id */
  collectionRunId: string;
  /**
   * Reference to the quarantined record. This is a pointer, not the record —
   * quarantined payloads may be sensitive and must not be copied into an
   * outbox row that leaves the DA layer.
   */
  recordReference: string;
  reason: string;
  correlationId: string;
  causationId?: string | null;
}

/** Emits da.data.quarantined (aggregate `collection_run`). */
export async function emitDataQuarantined(
  client: PoolClient,
  ctx: TenantContext,
  event: DataQuarantinedEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.dataQuarantined, [
    ctx.tenantId,
    ctx.workspaceId,
    event.collectionRunId,
    event.recordReference,
    event.reason,
    event.correlationId,
    event.causationId ?? null,
  ]);
}

// ── da.data.quality_scored ───────────────────────────────────────────────────

export interface DataQualityScoredEvent {
  /** Aggregate: data_acquisition.data_quality_scores.id */
  scoreId: string;
  sourceId: string;
  /** Bound to a numeric column; pass the score as a number, not a string. */
  overallScore: number;
  correlationId: string;
  causationId?: string | null;
}

/** Emits da.data.quality_scored (aggregate `data_quality_score`). */
export async function emitDataQualityScored(
  client: PoolClient,
  ctx: TenantContext,
  event: DataQualityScoredEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.dataQualityScored, [
    ctx.tenantId,
    ctx.workspaceId,
    event.scoreId,
    event.sourceId,
    event.overallScore,
    event.correlationId,
    event.causationId ?? null,
  ]);
}

// ── da.data.published ────────────────────────────────────────────────────────

export interface DataPublishedEvent {
  /** Aggregate: data_acquisition.publication_packages.id */
  packageId: string;
  /** Consuming layer, e.g. 'business-operations'. */
  targetLayer: string;
  /** Consuming block within that layer. */
  targetBlock: string;
  recordCount: number;
  correlationId: string;
  causationId?: string | null;
}

/**
 * Emits da.data.published (aggregate `publication_package`).
 *
 * This is the handoff event other layers subscribe to, so it must be emitted in
 * the same transaction that moves the package into its published state — never
 * after that transaction commits.
 */
export async function emitDataPublished(
  client: PoolClient,
  ctx: TenantContext,
  event: DataPublishedEvent,
): Promise<OutboxEventId> {
  return callWrapper(client, SQL.dataPublished, [
    ctx.tenantId,
    ctx.workspaceId,
    event.packageId,
    event.targetLayer,
    event.targetBlock,
    event.recordCount,
    event.correlationId,
    event.causationId ?? null,
  ]);
}
