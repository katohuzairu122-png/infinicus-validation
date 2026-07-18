# Data Acquisition — Event Outbox Integration

## Pattern

DA events are written transactionally to `events.outbox_events` in the same database transaction as the domain record. If the transaction rolls back, both the domain record and the event row are removed atomically.

## Outbox Helper Function

```sql
data_acquisition.emit_outbox_event(
  p_tenant_id       uuid,
  p_workspace_id    uuid,
  p_event_type      text,
  p_event_version   text,
  p_correlation_id  uuid,
  p_causation_id    uuid,
  p_payload         jsonb
) RETURNS uuid
```

Returns the new `events.outbox_events.id`. Call this inside the same transaction as the domain INSERT/UPDATE.

## Per-Event Wrappers

| Function | Event Type |
|----------|-----------|
| `emit_source_registered(...)` | `da.source.registered` |
| `emit_connector_registered(...)` | `da.connector.registered` |
| `emit_collection_started(...)` | `da.collection.started` |
| `emit_collection_completed(...)` | `da.collection.completed` |
| `emit_collection_failed(...)` | `da.collection.failed` |
| `emit_validation_completed(...)` | `da.validation.completed` |
| `emit_data_quarantined(...)` | `da.data.quarantined` |
| `emit_data_quality_scored(...)` | `da.data.quality_scored` |
| `emit_data_published(...)` | `da.data.published` |

## Usage from TypeScript

Emit an event inside a `withTenantTransaction` call after inserting the domain record:

```typescript
await withTenantTransaction(ctx, async (client) => {
  // 1. Insert domain record
  const run = await client.query('INSERT INTO data_acquisition.collection_runs ...');

  // 2. Emit outbox event in same transaction
  await client.query(
    'SELECT data_acquisition.emit_collection_started($1,$2,$3,$4,$5,$6,$7)',
    [ctx.tenantId, ctx.workspaceId, run.rows[0].id, sourceId, collectionType, correlationId, null]
  );
});
```

## Outbox Event Schema

Events land in `events.outbox_events` with:

```sql
status     = 'pending'
event_type = 'da.source.registered'  -- etc.
payload    = { ... }                 -- JSON payload per event type
```

A separate relay process (not in Stage 2B) reads pending events and publishes them to the external broker.

## Causation Tracking

All wrapper functions accept an optional `p_causation_id`. When a collection run triggers validation, the validation event should carry the collection run's `correlation_id` as its `causation_id`.

## Event Payload Schemas

### `da.source.registered`
```json
{ "sourceId": "<uuid>", "sourceCode": "<code>", "sourceType": "<type>" }
```

### `da.collection.completed`
```json
{
  "collectionRunId": "<uuid>",
  "sourceId": "<uuid>",
  "recordsReceived": 1000,
  "recordsAccepted": 998,
  "recordsRejected": 2
}
```

### `da.data.published`
```json
{
  "packageId": "<uuid>",
  "targetLayer": "business_operations",
  "targetBlock": "bo-01",
  "recordCount": 500
}
```
