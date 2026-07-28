# INFINICUS EVENT BACKBONE IMPLEMENTATION PLAN

Version: 1.0.0  
Status: Prepared for implementation  
Scope: Durable event backbone for the INFINICUS monorepo

---

# 1. Objective

Implement a durable, tenant-aware, versioned event backbone for the nine-layer INFINICUS platform.

The backbone must support:

- transactional outbox publication;
- inbox-based idempotent consumption;
- delivery attempts;
- retries;
- dead-letter handling;
- replay;
- schema validation;
- contract versioning;
- correlation and causation;
- tenant and workspace isolation;
- observability;
- controlled external relay integration.

This plan builds on:

- `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
- `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
- Database Stage 2A event tables
- Database Stage 2B Data Acquisition outbox functions
- Database Stage 2C Business Operations outbox requirements

---

# 2. Architectural Principles

The event backbone must follow these rules:

1. Domain changes and outbox events are committed atomically.
2. Producers publish facts, not commands.
3. Consumers are idempotent.
4. Consumers never trust unvalidated payloads.
5. Every event includes tenant, workspace, aggregate, correlation, and version context.
6. Event delivery is at-least-once.
7. Exactly-once business effects are achieved through inbox deduplication and transactional processing.
8. Failed deliveries are never silently discarded.
9. Replay never overwrites failure history.
10. Event contracts are centrally versioned.
11. External brokers are adapters, not sources of truth.
12. PostgreSQL remains the durable authority for event state.

---

# 3. Target Components

Create or complete:

```text
packages/event-contracts/
packages/handoff-contracts/
packages/database/
packages/observability/
apps/api/
infrastructure/eventing/
tests/eventing/
```

Recommended internal modules:

```text
packages/event-contracts/src/
├── envelope.ts
├── metadata.ts
├── registry.ts
├── validators.ts
├── errors.ts
├── versions.ts
├── events/
│   ├── da/
│   ├── bo/
│   ├── bi/
│   ├── dt/
│   ├── sim/
│   ├── adi/
│   ├── aba/
│   ├── om/
│   └── cl/
└── index.ts

packages/database/src/eventing/
├── OutboxRepository.ts
├── InboxRepository.ts
├── DeadLetterRepository.ts
├── EventSubscriptionRepository.ts
├── EventDeliveryAttemptRepository.ts
├── EventTransaction.ts
└── index.ts

apps/api/src/eventing/
├── relay/
├── consumers/
├── handlers/
├── middleware/
├── replay/
└── health/
```

---

# 4. Canonical Event Envelope

Use one canonical envelope for all platform events.

Required fields:

```text
id
eventType
eventVersion
tenantId
workspaceId
businessId nullable
aggregateType
aggregateId
correlationId
causationId nullable
producerLayer
producerBlock nullable
occurredAt
publishedAt nullable
payload
metadata
```

Required metadata:

```text
sourceSystem
sourceRecordId nullable
traceId nullable
actorType nullable
actorId nullable
schemaName
schemaVersion
idempotencyKey nullable
retryCount nullable
sensitivity
```

Do not create multiple competing envelope formats.

---

# 5. Event Contract Registry

Implement a contract registry in `packages/event-contracts`.

Each registered contract must contain:

```text
eventType
eventVersion
schemaName
producerLayer
producerBlock
supportedConsumers
status
validator
effectiveFrom
deprecatedAt nullable
```

Statuses:

```text
draft
active
deprecated
retired
```

Registry capabilities:

- register contract;
- retrieve by event type and version;
- validate envelope;
- reject unknown event versions;
- detect duplicate registration;
- list active contracts;
- list deprecated contracts;
- provide compatibility metadata.

Use Zod for runtime validation.

---

# 6. Initial Event Contract Set

Implement these first:

```text
da.data.published
bo.business_profile.updated
bo.order.created
bo.order.completed
bo.payment.recorded
bo.inventory.adjusted
bo.data.published
bi.analysis.completed
dt.state.updated
sim.simulation.completed
adi.decision.generated
aba.action.approved
aba.action.executed
om.outcome.recorded
cl.learning.published
platform.handoff.acknowledged
platform.handoff.rejected
platform.handoff.revoked
```

These contracts support the first full vertical slice.

Do not implement every catalogue event in the first batch.

---

# 7. Outbox Repository

Implement:

```ts
interface OutboxRepository {
  enqueue(event: PlatformEventInput, tx: DatabaseTransaction): Promise<StoredOutboxEvent>;
  claimBatch(options: ClaimBatchOptions): Promise<StoredOutboxEvent[]>;
  markProcessing(eventId: string, workerId: string): Promise<void>;
  markPublished(eventId: string, publishedAt: Date): Promise<void>;
  markFailed(eventId: string, failure: EventFailure): Promise<void>;
  moveToDeadLetter(eventId: string, failure: EventFailure): Promise<void>;
  releaseStaleClaims(cutoff: Date): Promise<number>;
}
```

Requirements:

- enqueue only inside a transaction;
- claim rows using `FOR UPDATE SKIP LOCKED`;
- use bounded batches;
- preserve ordering where aggregate ordering is required;
- do not claim unavailable events before `available_at`;
- increment attempts atomically;
- avoid duplicate publication state transitions.

---

# 8. Inbox Repository

Implement:

```ts
interface InboxRepository {
  beginProcessing(input: InboxProcessingInput, tx: DatabaseTransaction): Promise<InboxProcessingResult>;
  markProcessed(eventId: string, consumerName: string, tx: DatabaseTransaction): Promise<void>;
  markFailed(eventId: string, consumerName: string, failure: EventFailure, tx: DatabaseTransaction): Promise<void>;
  hasProcessed(eventId: string, consumerName: string): Promise<boolean>;
}
```

Rules:

- unique key: `(event_id, consumer_name)`;
- duplicate successful processing returns an idempotent no-op;
- duplicate in-progress processing is controlled;
- processing state changes occur in the same transaction as domain changes;
- downstream outbox events are committed atomically.

---

# 9. Delivery Attempts

Persist every delivery attempt separately.

Required fields:

```text
event_id
subscription_id
consumer_name
attempt_number
started_at
completed_at nullable
status
failure_code nullable
failure_message nullable
worker_id
latency_ms nullable
metadata
```

Statuses:

```text
started
succeeded
failed
timed_out
cancelled
```

Do not overwrite prior attempts.

---

# 10. Retry Policy

Default retry schedule:

```text
1: immediate
2: 30 seconds
3: 2 minutes
4: 10 minutes
5: 30 minutes
6: 2 hours
```

Implement retry calculation centrally.

Do not retry permanent failures:

```text
unsupported_event_version
schema_validation_failed
tenant_scope_invalid
workspace_scope_invalid
authorization_failed
permanent_entity_missing
invalid_state_transition
policy_blocked
```

Retry transient failures:

```text
database_unavailable
lock_timeout
network_timeout
broker_unavailable
temporary_dependency_failure
rate_limited
```

---

# 11. Dead-Letter Processing

Implement dead-letter persistence and controlled replay.

Required operations:

```text
list dead-letter events
inspect failure history
approve replay
reject replay
replay one event
replay filtered batch
mark replay succeeded
mark replay failed
```

Replay requirements:

- create a new delivery attempt;
- preserve original event;
- preserve original correlation ID;
- create a replay causation reference;
- validate current contract support;
- require an operator or approved automation;
- log audit event.

Do not automatically replay permanently invalid events.

---

# 12. Relay Worker

Create a relay worker that:

1. claims an outbox batch;
2. validates contract;
3. resolves subscriptions;
4. publishes to destination adapter;
5. records delivery attempt;
6. marks event published when required destinations succeed;
7. schedules retry on transient failure;
8. dead-letters permanent or exhausted failures;
9. emits metrics and logs.

Initial destination adapter:

```text
in_process
```

Optional later adapters:

```text
webhook
n8n
cloud_queue
message_broker
```

Do not make n8n or an external broker the source of truth.

---

# 13. In-Process Consumer Adapter

Implement a local consumer registry for monorepo development and first vertical-slice testing.

Capabilities:

- register consumer by event pattern;
- declare supported versions;
- invoke typed handler;
- enforce timeout;
- validate tenant and workspace context;
- use inbox deduplication;
- expose consumer health.

Example:

```ts
registerConsumer({
  name: "business-operations-business-intake",
  eventTypes: ["da.data.published"],
  supportedVersions: [1],
  handler: handleDataPublished
});
```

---

# 14. Event Subscription Model

Use `events.event_subscriptions`.

Each subscription should contain:

```text
name
event_pattern
destination_type
destination_reference
status
retry_policy
supported_versions
consumer_group
ordering_mode
timeout_seconds
created_at
updated_at
```

Ordering modes:

```text
none
aggregate
business
strict
```

Default:

```text
aggregate
```

Strict global ordering should be avoided.

---

# 15. Handler Transaction Pattern

Every consumer handler must follow:

```text
receive event
→ validate envelope
→ validate contract version
→ begin tenant transaction
→ begin inbox processing
→ detect duplicate
→ load domain state
→ validate state transition
→ apply domain changes
→ enqueue downstream event
→ mark inbox processed
→ commit
```

On error:

```text
rollback
→ classify failure
→ record attempt
→ retry or dead-letter
```

---

# 16. Correlation and Causation

Rules:

- preserve `correlationId` through the entire business workflow;
- set `causationId` to the immediate triggering event ID;
- create a new event ID for every emitted event;
- never reuse event IDs;
- expose correlation search in observability tooling.

Canonical chain:

```text
da.data.published
→ bo.business_profile.updated
→ bo.data.published
→ bi.analysis.completed
→ dt.state.updated
→ sim.simulation.completed
→ adi.decision.generated
→ aba.action.approved
→ aba.action.executed
→ om.outcome.recorded
→ cl.learning.published
```

---

# 17. Tenant and Workspace Isolation

All event repositories and consumers must:

- require tenant and workspace context;
- use `withTenantTransaction()`;
- enforce RLS;
- reject tenant mismatch;
- reject workspace mismatch;
- prevent cross-tenant replay;
- prevent subscriptions from consuming unauthorized tenant events.

System relay workers may use a privileged database role only for claiming, but must re-enter the application transaction using the event tenant and workspace before domain processing.

---

# 18. Security

Do not place in event payloads:

- passwords;
- API keys;
- access tokens;
- refresh tokens;
- private keys;
- full payment card data;
- raw confidential documents;
- binary files.

Use references:

```text
credentialReferenceId
fileObjectId
documentReference
customerId
paymentId
```

Validate sensitivity metadata before dispatch to external destinations.

Restricted events require destination authorization.

---

# 19. Observability

Emit structured logs for:

```text
event_enqueued
event_claimed
event_validated
event_published
event_consumed
event_duplicate_ignored
event_retry_scheduled
event_dead_lettered
event_replayed
event_replay_failed
consumer_failed
consumer_timed_out
```

Required log fields:

```text
eventId
eventType
eventVersion
tenantId
workspaceId
businessId
aggregateType
aggregateId
correlationId
causationId
consumerName
attemptNumber
durationMs
status
failureCode
```

Metrics:

```text
outbox_pending_total
outbox_oldest_pending_seconds
event_publish_success_total
event_publish_failure_total
event_retry_total
dead_letter_total
consumer_processing_seconds
consumer_success_total
consumer_failure_total
inbox_duplicate_total
replay_success_total
replay_failure_total
```

---

# 20. Health Checks

Expose:

```text
/eventing/health
/eventing/readiness
/eventing/metrics
```

Health must include:

- database connectivity;
- outbox backlog;
- stale processing claims;
- dead-letter growth;
- consumer registry;
- contract registry;
- relay worker state.

Readiness should fail when:

- contract registry cannot initialize;
- database is unavailable;
- relay cannot claim events;
- critical consumers are not registered.

---

# 21. Configuration

Add environment variables:

```text
EVENT_RELAY_ENABLED
EVENT_RELAY_BATCH_SIZE
EVENT_RELAY_POLL_INTERVAL_MS
EVENT_RELAY_WORKER_ID
EVENT_RELAY_MAX_ATTEMPTS
EVENT_CONSUMER_TIMEOUT_MS
EVENT_STALE_CLAIM_SECONDS
EVENT_DEAD_LETTER_ENABLED
EVENT_REPLAY_ENABLED
```

Use safe defaults for development.

Do not commit credentials.

---

# 22. First Vertical Slice Consumers

Implement these consumer links first:

```text
da.data.published
→ BO business intake handler

bo.data.published
→ BI analysis intake handler

bi.analysis.completed
→ DT calibration handler

dt.state.updated
→ SIM request handler

sim.simulation.completed
→ ADI decision handler

adi.decision.generated
→ ABA approval intake handler

aba.action.executed
→ OM monitoring intake handler

om.outcome.recorded
→ CL learning intake handler
```

Placeholder handlers may validate and persist intake records, but must not falsely claim complete domain logic.

---

# 23. Testing Matrix

## Contract tests

- valid envelope accepted;
- unknown event rejected;
- unsupported version rejected;
- missing aggregate rejected;
- missing tenant rejected;
- invalid sensitivity rejected;
- invalid payload rejected.

## Outbox tests

- enqueue within transaction;
- rollback removes event;
- batch claiming excludes locked rows;
- unavailable event not claimed;
- stale claim released;
- published event not reclaimed;
- failed event rescheduled;
- exhausted event dead-lettered.

## Inbox tests

- first processing accepted;
- duplicate successful processing ignored;
- duplicate in-progress controlled;
- failed processing recorded;
- domain update and inbox status atomic;
- downstream outbox event atomic.

## Retry tests

- transient failure scheduled;
- permanent failure dead-lettered;
- exponential delay correct;
- maximum attempts enforced.

## Replay tests

- replay preserves original event;
- replay creates new attempt;
- replay validates current contract;
- unauthorized replay rejected;
- cross-tenant replay rejected.

## RLS tests

- tenant A cannot read tenant B outbox events through app role;
- tenant A cannot process tenant B inbox events;
- workspace boundary enforced;
- missing context fails closed.

## Vertical-slice tests

- full correlation chain preserved;
- causation chain correct;
- duplicate event does not duplicate business effects;
- failure at one stage does not corrupt prior committed stages;
- replay resumes from failed consumer.

---

# 24. CI Requirements

CI must provide PostgreSQL integration testing.

Required pipeline stages:

```text
install
workspace validation
lint
typecheck
unit tests
PostgreSQL service startup
migrations
eventing integration tests
RLS tests
vertical-slice tests
build
```

Required environment variables in CI:

```text
DATABASE_URL
ADMIN_DATABASE_URL
```

Integration tests must not silently pass when a database is expected.

Use explicit CI behavior:

```text
local without DB → skip allowed
CI without DB → fail
```

---

# 25. Implementation Phases

## Phase 1 — Contracts

- canonical envelope;
- metadata;
- Zod schemas;
- registry;
- initial 18 event contracts;
- unit tests.

## Phase 2 — Database repositories

- outbox;
- inbox;
- attempts;
- subscriptions;
- dead letters;
- integration tests.

## Phase 3 — Relay and local adapter

- claim loop;
- in-process destination;
- retry classification;
- metrics;
- health.

## Phase 4 — First consumers

- DA → BO;
- BO → BI;
- BI → DT;
- DT → SIM;
- SIM → ADI;
- ADI → ABA;
- ABA → OM;
- OM → CL.

## Phase 5 — Replay and operations

- dead-letter inspection;
- manual replay;
- batch replay;
- audit logging;
- operational endpoints.

## Phase 6 — External adapters

- n8n;
- webhook;
- queue or broker;
- destination authorization;
- delivery signatures.

---

# 26. Token-Efficient Claude Execution Order

Give Claude one task at a time:

```text
Task 1: Implement event contracts package only.
Task 2: Implement event database repositories only.
Task 3: Implement relay worker with in-process adapter.
Task 4: Implement DA → BO consumer.
Task 5: Implement BO → BI consumer.
Task 6: Implement remaining first vertical-slice consumers.
Task 7: Implement replay operations.
Task 8: Add CI database eventing tests.
```

Do not ask Claude to implement the entire backbone in one session.

---

# 27. Completion Criteria

The event backbone is not complete until:

- initial event contracts are registered;
- outbox and inbox repositories pass live tests;
- event claiming is concurrency-safe;
- retry and dead-letter behavior pass;
- replay passes;
- tenant and workspace isolation pass;
- the first vertical slice preserves correlation and causation;
- duplicate delivery does not duplicate business effects;
- CI runs live PostgreSQL eventing tests;
- documentation is complete.

---

# 28. Prohibited Work

Do not:

- replace PostgreSQL authority with n8n;
- use direct layer-to-layer database writes;
- bypass inbox idempotency;
- publish before domain commit;
- place secrets in payloads;
- create unversioned events;
- silently ignore unknown event versions;
- allow unlimited retries;
- overwrite delivery history;
- replay without audit evidence;
- deploy external broker infrastructure before the local backbone is verified.

---

# 29. Required Documentation

Create:

```text
docs/event-backbone.md
docs/event-contract-registry.md
docs/event-retry-dead-letter.md
docs/event-replay.md
docs/event-security.md
docs/event-observability.md
docs/event-ci.md
```

---

# 30. Next Implementation Prompt

After Database Stage 2C is complete and frozen, the next implementation prompt should be:

```text
Implement Event Backbone Phase 1 — canonical event contracts,
Zod schemas, registry, initial event set, and contract tests only.
Stop before database relay implementation.
```
