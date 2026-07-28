# INFINICUS EVENT BACKBONE — PHASE 2 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phase 1 implementation and report
6. Existing Stage 2A and Stage 2B database conventions
7. Existing PostgreSQL integration-test harness
8. Existing tenancy and RLS transaction helpers

## Objective

Implement Event Backbone Phase 2 only:

- outbox repository;
- inbox repository;
- dead-letter repository;
- event subscription repository;
- delivery-attempt repository;
- event transaction helpers;
- live PostgreSQL integration tests;
- documentation.

Do not implement:

- relay worker;
- polling loop;
- consumers;
- external adapters;
- n8n integration;
- replay API;
- frontend;
- new layer schemas.

Stop after event database repositories and live tests are complete.

---

# 1. PRECONDITIONS

Confirm before changing code:

- Event Backbone Phase 1 exists and passes;
- initial event contracts are registered;
- `events.outbox_events` exists;
- `events.inbox_events` exists;
- `events.dead_letter_events` exists;
- `events.event_subscriptions` exists;
- `events.event_delivery_attempts` exists;
- Stage 2A and Stage 2B migrations remain frozen;
- existing database integration harness works.

Do not modify frozen migrations unless a live test reveals a confirmed database defect.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
packages/database/src/eventing/
├── OutboxRepository.ts
├── InboxRepository.ts
├── DeadLetterRepository.ts
├── EventSubscriptionRepository.ts
├── EventDeliveryAttemptRepository.ts
├── EventTransaction.ts
├── eventing-errors.ts
├── eventing-types.ts
└── index.ts
```

Tests:

```text
packages/database/tests/eventing/
├── outbox.integration.test.ts
├── inbox.integration.test.ts
├── dead-letter.integration.test.ts
├── subscriptions.integration.test.ts
├── delivery-attempts.integration.test.ts
├── event-transaction.integration.test.ts
└── eventing-rls.integration.test.ts
```

Use the actual repository conventions where different.

---

# 3. OUTBOX REPOSITORY

Implement:

```ts
interface OutboxRepository {
  enqueue(
    event: PlatformEventInput,
    tx: DatabaseTransaction
  ): Promise<StoredOutboxEvent>;

  claimBatch(
    options: ClaimBatchOptions
  ): Promise<StoredOutboxEvent[]>;

  markProcessing(
    eventId: string,
    workerId: string
  ): Promise<void>;

  markPublished(
    eventId: string,
    publishedAt: Date
  ): Promise<void>;

  markFailed(
    eventId: string,
    failure: EventFailure
  ): Promise<void>;

  scheduleRetry(
    eventId: string,
    availableAt: Date,
    failure: EventFailure
  ): Promise<void>;

  moveToDeadLetter(
    eventId: string,
    failure: EventFailure
  ): Promise<void>;

  releaseStaleClaims(
    cutoff: Date
  ): Promise<number>;
}
```

## Outbox rules

- enqueue only inside a transaction;
- validate against Event Backbone Phase 1 contracts before insert;
- use parameterized SQL only;
- preserve event ID;
- preserve correlation and causation IDs;
- preserve aggregate type and ID;
- store event version;
- store payload and headers as JSONB;
- claim using `FOR UPDATE SKIP LOCKED`;
- claim only `pending` or retry-eligible events;
- ignore events whose `available_at` is in the future;
- do not reclaim `published` or `dead_lettered` events;
- increment attempt count atomically;
- worker claim must be traceable;
- stale processing claims must be releasable safely.

---

# 4. CLAIMING MODEL

Use bounded batch claiming.

Required options:

```ts
interface ClaimBatchOptions {
  workerId: string;
  batchSize: number;
  now: Date;
  eventTypes?: string[];
}
```

Constraints:

- batch size positive and bounded;
- default maximum documented;
- multiple workers must not claim the same row;
- ordering by `available_at`, then `created_at`;
- aggregate ordering must not be broken where supported by current schema;
- claim transaction must complete quickly;
- no long-running handler inside the claim transaction.

---

# 5. INBOX REPOSITORY

Implement:

```ts
interface InboxRepository {
  beginProcessing(
    input: InboxProcessingInput,
    tx: DatabaseTransaction
  ): Promise<InboxProcessingResult>;

  markProcessed(
    eventId: string,
    consumerName: string,
    tx: DatabaseTransaction
  ): Promise<void>;

  markFailed(
    eventId: string,
    consumerName: string,
    failure: EventFailure,
    tx: DatabaseTransaction
  ): Promise<void>;

  hasProcessed(
    eventId: string,
    consumerName: string
  ): Promise<boolean>;
}
```

## Inbox rules

Unique idempotency key:

```text
(event_id, consumer_name)
```

Behavior:

- first processing attempt creates an inbox record;
- repeated successful event returns idempotent no-op;
- repeated in-progress event returns controlled result;
- failed record can be retried according to policy;
- inbox state and domain changes occur in the same transaction;
- downstream outbox event can be inserted in the same transaction;
- no duplicate business effect after duplicate delivery.

Suggested result:

```ts
type InboxProcessingResult =
  | { state: "started" }
  | { state: "already_processed" }
  | { state: "already_processing" }
  | { state: "retry_allowed"; previousAttemptCount: number };
```

---

# 6. DEAD-LETTER REPOSITORY

Implement:

```ts
interface DeadLetterRepository {
  createFromOutbox(
    eventId: string,
    failure: EventFailure,
    tx: DatabaseTransaction
  ): Promise<DeadLetterEvent>;

  findById(
    deadLetterId: string,
    context: TenantContext
  ): Promise<DeadLetterEvent>;

  list(
    query: DeadLetterQuery,
    context: TenantContext
  ): Promise<DeadLetterEvent[]>;

  markReplayApproved(
    deadLetterId: string,
    approvedBy: string,
    context: TenantContext
  ): Promise<void>;

  markReplayStarted(
    deadLetterId: string,
    replayEventId: string,
    context: TenantContext
  ): Promise<void>;

  markReplaySucceeded(
    deadLetterId: string,
    context: TenantContext
  ): Promise<void>;

  markReplayFailed(
    deadLetterId: string,
    failure: EventFailure,
    context: TenantContext
  ): Promise<void>;
}
```

Phase 2 must persist replay state only.

Do not implement replay orchestration or API yet.

Preserve:

- original event;
- original payload;
- event type and version;
- failure history;
- attempt count;
- correlation and causation;
- tenant and workspace;
- replay status.

---

# 7. EVENT SUBSCRIPTION REPOSITORY

Implement:

```ts
interface EventSubscriptionRepository {
  create(
    input: CreateEventSubscriptionInput,
    context: TenantContext
  ): Promise<EventSubscription>;

  findById(
    subscriptionId: string,
    context: TenantContext
  ): Promise<EventSubscription>;

  listMatching(
    eventType: string,
    eventVersion: number,
    context: TenantContext
  ): Promise<EventSubscription[]>;

  updateStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    context: TenantContext
  ): Promise<void>;
}
```

Support:

```text
destination_type
destination_reference
event_pattern
supported_versions
consumer_group
ordering_mode
timeout_seconds
retry_policy
status
```

Statuses:

```text
active
paused
disabled
failed
```

Ordering modes:

```text
none
aggregate
business
strict
```

Default ordering:

```text
aggregate
```

No external adapter implementation in Phase 2.

---

# 8. DELIVERY-ATTEMPT REPOSITORY

Implement:

```ts
interface EventDeliveryAttemptRepository {
  start(
    input: StartDeliveryAttemptInput,
    context: TenantContext
  ): Promise<EventDeliveryAttempt>;

  markSucceeded(
    attemptId: string,
    completedAt: Date,
    latencyMs: number,
    context: TenantContext
  ): Promise<void>;

  markFailed(
    attemptId: string,
    failure: EventFailure,
    completedAt: Date,
    latencyMs: number,
    context: TenantContext
  ): Promise<void>;

  listByEvent(
    eventId: string,
    context: TenantContext
  ): Promise<EventDeliveryAttempt[]>;
}
```

Attempts are append-only.

Do not overwrite prior attempts.

Statuses:

```text
started
succeeded
failed
timed_out
cancelled
```

---

# 9. EVENT TRANSACTION HELPER

Implement a helper that supports:

```text
domain change
+
inbox update
+
downstream outbox enqueue
```

inside one tenant-scoped transaction.

Suggested interface:

```ts
async function withEventTransaction<T>(
  context: TenantContext,
  callback: (tx: EventTransactionContext) => Promise<T>
): Promise<T>;
```

Context should expose:

```text
database transaction
inbox repository
outbox repository
tenant context
correlation context
```

Requirements:

- `SET LOCAL` tenant, workspace, and user settings;
- rollback on any failure;
- no cross-request context bleed;
- downstream event disappears when transaction rolls back;
- inbox processed state disappears when domain change rolls back.

---

# 10. ERROR TYPES

Create controlled eventing database errors:

```text
OutboxEventNotFoundError
OutboxClaimConflictError
InboxProcessingConflictError
DeadLetterEventNotFoundError
SubscriptionNotFoundError
DeliveryAttemptNotFoundError
InvalidEventTransitionError
EventingTenantContextError
```

Errors must include controlled codes and safe metadata.

Do not include full sensitive event payloads in error messages.

---

# 11. SHARED TYPES

Add only required central types.

Examples:

```text
OutboxEventId
InboxEventId
DeadLetterEventId
EventSubscriptionId
DeliveryAttemptId
OutboxStatus
InboxStatus
SubscriptionStatus
DeliveryAttemptStatus
EventFailure
RetryDecision
```

Do not duplicate Event Backbone Phase 1 envelope or payload types.

---

# 12. TENANT AND WORKSPACE SECURITY

All tenant-owned event operations must:

- require `TenantContext`;
- use `withTenantTransaction()`;
- enforce RLS;
- block cross-tenant access;
- block same-tenant cross-workspace access;
- fail closed without tenant context;
- preserve system relay separation from application processing.

A BYPASSRLS admin pool may be used by test setup and future relay claiming only.

Domain processing must re-enter tenant-scoped application context.

---

# 13. STATUS TRANSITIONS

Enforce controlled transitions.

## Outbox

```text
pending → processing
processing → published
processing → failed
failed → pending
failed → dead_lettered
processing → dead_lettered
```

Reject:

```text
published → processing
dead_lettered → pending
published → failed
```

## Inbox

```text
received → processing
processing → processed
processing → failed
failed → processing
```

## Delivery attempt

```text
started → succeeded
started → failed
started → timed_out
started → cancelled
```

Historical attempts are immutable after terminal status.

---

# 14. RETRY DATA

Phase 2 must persist retry information.

Implement:

```ts
interface EventFailure {
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}
```

Store:

```text
attempt count
last failure code
last failure message
next available time
first failure time where supported
last failure time
```

Do not implement the relay retry loop yet.

---

# 15. LIVE POSTGRESQL TESTS

Use the existing two-pool integration harness.

## Outbox tests

- enqueue valid event;
- reject invalid event contract;
- rollback removes event;
- claim batch;
- concurrent workers do not double-claim;
- future event not claimed;
- published event not reclaimed;
- stale claim released;
- invalid transition rejected;
- retry scheduling persists;
- move to dead letter preserves event.

## Inbox tests

- first processing starts;
- duplicate processed event returns no-op;
- duplicate processing is controlled;
- failed event can retry;
- domain write and inbox state atomic;
- downstream outbox write atomic;
- duplicate event does not duplicate domain effect.

## Dead-letter tests

- original event preserved;
- failure details preserved;
- tenant isolation;
- workspace isolation;
- replay approval state persists;
- replay outcome state persists.

## Subscription tests

- create subscription;
- matching event pattern;
- supported version filtering;
- inactive subscription excluded;
- tenant isolation;
- workspace isolation;
- invalid ordering mode rejected.

## Delivery-attempt tests

- start attempt;
- succeed attempt;
- fail attempt;
- timeout attempt;
- immutable terminal state;
- list complete history;
- tenant isolation.

## Event transaction tests

- domain + inbox + outbox commit together;
- any failure rolls all back;
- tenant context available inside transaction;
- correlation and causation preserved.

## RLS tests

- tenant A cannot read tenant B event records;
- same-tenant cross-workspace access blocked;
- missing context returns zero rows or controlled error;
- application role cannot bypass RLS.

Target:

```text
at least 80 meaningful live integration tests
```

---

# 16. STRUCTURAL TESTS

Verify:

- repository files exist;
- public exports exist;
- expected database tables exist;
- expected columns exist;
- expected indexes exist;
- RLS is enabled;
- unique inbox idempotency constraint exists;
- status constraints exist;
- foreign keys exist;
- delivery attempts remain historical.

---

# 17. DOCUMENTATION

Create or update:

```text
packages/database/README.md
docs/event-outbox-repository.md
docs/event-inbox-idempotency.md
docs/event-dead-letter-storage.md
docs/event-subscriptions.md
docs/event-delivery-attempts.md
docs/event-transaction-pattern.md
docs/event-backbone-phase-2.md
```

Document:

- repository APIs;
- status transitions;
- claim behavior;
- transaction pattern;
- idempotency;
- RLS usage;
- retry persistence;
- dead-letter persistence;
- integration-test environment;
- what remains for Phase 3.

---

# 18. VALIDATION COMMANDS

Run:

```bash
pnpm install
pnpm workspace:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @infinicus/database test:integration
```

Run against PostgreSQL 16.

Do not use production credentials.

Do not claim completion unless all live tests pass.

---

# 19. PROHIBITED WORK

Do not implement:

- relay polling worker;
- local consumer registry;
- actual event handlers;
- n8n adapter;
- webhook adapter;
- broker adapter;
- dead-letter replay execution;
- replay endpoints;
- eventing UI;
- new database schemas for later layers;
- frontend expansion.

---

# 20. STOP CONDITION

Stop after:

1. all five repositories exist;
2. event transaction helper exists;
3. controlled errors and types exist;
4. live PostgreSQL tests pass;
5. RLS tests pass;
6. documentation is complete;
7. completion report is produced.

Do not begin Event Backbone Phase 3.

---

# 21. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 2 REPORT

Created:
- outbox repository
- inbox repository
- dead-letter repository
- subscription repository
- delivery-attempt repository
- event transaction helper
- shared types
- errors
- tests
- documentation

Modified:
- exact files
- reason

Validation:
- command
- result

Live PostgreSQL verification:
- outbox enqueue
- claim concurrency
- retry persistence
- stale-claim release
- inbox idempotency
- transaction atomicity
- dead-letter persistence
- subscription matching
- delivery-attempt history
- RLS tenant isolation
- RLS workspace isolation
- fail-closed behavior

Repository totals:
- repositories
- methods
- integration tests
- tests passing

Security:
- tenant isolation
- workspace isolation
- application-role RLS
- sensitive payload handling
- error redaction

Not started:
- relay worker
- consumer registry
- handlers
- replay execution
- external adapters

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 3 — relay worker and in-process adapter
```
