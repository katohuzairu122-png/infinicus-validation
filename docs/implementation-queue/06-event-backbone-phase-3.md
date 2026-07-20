# INFINICUS EVENT BACKBONE — PHASE 3 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phase 1 implementation and report
6. Event Backbone Phase 2 implementation and report
7. Existing database repositories and integration-test harness
8. Existing observability and configuration packages

## Objective

Implement Event Backbone Phase 3 only:

- relay worker;
- bounded outbox polling;
- event contract validation before dispatch;
- in-process destination adapter;
- consumer registry;
- delivery-attempt recording;
- retry scheduling;
- dead-letter transition;
- health and readiness checks;
- structured logs and metrics;
- unit and live PostgreSQL integration tests;
- documentation.

Do not implement:

- domain consumers for DA → BO or later layers;
- n8n adapter;
- webhook adapter;
- cloud queue or broker adapter;
- replay execution;
- eventing UI;
- later database schemas.

Stop after the relay worker and in-process adapter are complete and tested.

---

# 1. PRECONDITIONS

Confirm:

- Phase 1 contracts pass;
- Phase 2 repositories pass;
- outbox, inbox, attempts, subscriptions, and dead-letter persistence work;
- frozen migrations remain unchanged;
- PostgreSQL integration harness works;
- event contract registry can validate the initial event set.

Do not modify frozen migrations unless a live relay test exposes a confirmed schema defect.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
apps/api/src/eventing/
├── relay/
│   ├── EventRelayWorker.ts
│   ├── RelayLoop.ts
│   ├── RelayCoordinator.ts
│   ├── RelayState.ts
│   └── index.ts
├── adapters/
│   ├── EventDestinationAdapter.ts
│   ├── InProcessEventAdapter.ts
│   └── index.ts
├── consumers/
│   ├── ConsumerRegistry.ts
│   ├── ConsumerDefinition.ts
│   └── index.ts
├── retry/
│   ├── RetryPolicy.ts
│   ├── FailureClassifier.ts
│   └── index.ts
├── health/
│   ├── EventingHealthService.ts
│   ├── EventingReadinessService.ts
│   └── index.ts
├── observability/
│   ├── eventing-logger.ts
│   ├── eventing-metrics.ts
│   └── index.ts
├── configuration.ts
└── index.ts
```

Use an alternative package path only if the existing monorepo already has a clearer runtime host.

---

# 3. RELAY WORKER

Implement a worker with:

```ts
interface EventRelayWorker {
  start(): Promise<void>;
  stop(): Promise<void>;
  runOnce(): Promise<RelayCycleResult>;
  getState(): RelayWorkerState;
}
```

States:

```text
stopped
starting
running
stopping
failed
```

Requirements:

- bounded batch size;
- configurable poll interval;
- one cycle claim-dispatch-finalize flow;
- graceful stop;
- no overlapping cycles within one worker;
- support multiple workers through database claim locking;
- safe worker ID;
- stale-claim recovery;
- exception isolation per event;
- no process crash from one failed delivery.

---

# 4. RELAY CYCLE

Each cycle must:

```text
claim eligible outbox batch
→ validate each event contract
→ resolve matching subscriptions
→ dispatch through destination adapter
→ record delivery attempt
→ mark success, retry, or dead-letter
→ emit logs and metrics
```

Rules:

- invalid contract is a permanent failure;
- unsupported event version is a permanent failure;
- no matching active subscription is handled according to policy;
- one subscription failure must not corrupt another subscription’s attempt history;
- published status must follow documented completion semantics;
- relay transaction scopes must remain short.

---

# 5. CONSUMER REGISTRY

Implement:

```ts
interface ConsumerRegistry {
  register(definition: ConsumerDefinition): void;
  get(name: string): ConsumerDefinition;
  list(): ConsumerDefinition[];
  resolve(eventType: string, eventVersion: number): ConsumerDefinition[];
}
```

Consumer definition:

```ts
interface ConsumerDefinition<TPayload = unknown> {
  name: string;
  eventTypes: string[];
  supportedVersions: number[];
  timeoutMs: number;
  handler: EventConsumerHandler<TPayload>;
  healthCritical?: boolean;
}
```

Rules:

- duplicate consumer name rejected;
- unsupported event version not dispatched;
- timeout positive and bounded;
- event pattern behavior explicit;
- registry initialization deterministic;
- no hidden global mutable registry in tests.

---

# 6. IN-PROCESS DESTINATION ADAPTER

Implement:

```ts
interface EventDestinationAdapter {
  destinationType: string;
  deliver(input: DeliveryInput): Promise<DeliveryResult>;
}
```

Initial adapter:

```text
in_process
```

Behavior:

- resolve consumer by destination reference;
- validate supported version;
- enforce timeout;
- invoke typed handler;
- return controlled success or failure;
- never expose raw stack traces as event failure messages;
- preserve event ID, correlation ID, and causation ID.

Do not implement actual cross-layer domain handlers in Phase 3.

Use test consumers only.

---

# 7. DELIVERY COMPLETION SEMANTICS

Document and implement one clear model.

Recommended:

- every matching required subscription must succeed before outbox event is marked `published`;
- optional subscriptions may fail without blocking only when explicitly configured;
- no subscriptions means either:
  - mark published with `no_subscribers` only for allowed event classes; or
  - mark failed according to strict policy.

Default:

```text
strict_required_subscriptions
```

Do not silently mark an event published when required delivery failed.

---

# 8. RETRY POLICY

Implement centralized delay calculation.

Default schedule:

```text
attempt 1: immediate
attempt 2: 30 seconds
attempt 3: 2 minutes
attempt 4: 10 minutes
attempt 5: 30 minutes
attempt 6: 2 hours
```

Provide:

```ts
interface RetryPolicy {
  maxAttempts: number;
  nextAvailableAt(attemptNumber: number, now: Date): Date | null;
}
```

Requirements:

- deterministic unit tests;
- no negative delay;
- maximum attempt enforced;
- optional jitter must be configurable and disabled in deterministic tests;
- final exhausted attempt moves to dead letter.

---

# 9. FAILURE CLASSIFICATION

Implement:

```ts
type FailureClass = "transient" | "permanent";
```

Permanent examples:

```text
unsupported_event_version
schema_validation_failed
tenant_scope_invalid
workspace_scope_invalid
authorization_failed
invalid_state_transition
policy_blocked
consumer_not_registered
```

Transient examples:

```text
database_unavailable
lock_timeout
network_timeout
consumer_timeout
temporary_dependency_failure
rate_limited
```

Unknown failures default to:

```text
transient until max attempts
```

unless policy says otherwise.

---

# 10. DELIVERY ATTEMPTS

For every subscription dispatch:

1. create attempt record;
2. capture start time;
3. dispatch;
4. capture completion time;
5. calculate latency;
6. mark success or failure;
7. preserve worker ID;
8. preserve failure code;
9. never overwrite earlier attempts.

Terminal attempt records are immutable.

---

# 11. DEAD-LETTER TRANSITION

Move event to dead letter when:

- permanent failure occurs;
- maximum attempts exhausted;
- contract is retired or unsupported;
- required consumer is permanently unavailable according to policy.

Requirements:

- preserve original event;
- preserve payload;
- preserve correlation and causation;
- preserve final failure;
- record attempt count;
- mark outbox event `dead_lettered`;
- emit audit/log/metric signal.

Do not implement replay execution in Phase 3.

---

# 12. CONFIGURATION

Add:

```text
EVENT_RELAY_ENABLED
EVENT_RELAY_BATCH_SIZE
EVENT_RELAY_POLL_INTERVAL_MS
EVENT_RELAY_WORKER_ID
EVENT_RELAY_MAX_ATTEMPTS
EVENT_CONSUMER_TIMEOUT_MS
EVENT_STALE_CLAIM_SECONDS
EVENT_DEAD_LETTER_ENABLED
EVENT_STRICT_SUBSCRIPTIONS
```

Requirements:

- parse and validate configuration;
- safe defaults for development;
- invalid values fail startup clearly;
- no secrets in config;
- worker ID generated safely when omitted.

---

# 13. HEALTH AND READINESS

Implement services for:

```text
/eventing/health
/eventing/readiness
```

Actual HTTP routes are optional if `apps/api` runtime is still a stub. Service methods are required.

Health result must include:

```text
relay state
database connectivity
outbox pending count
oldest pending age
stale claim count
dead-letter count
registered consumer count
active subscription count
contract registry status
```

Readiness must fail when:

- database unavailable;
- contract registry unavailable;
- relay enabled but cannot claim;
- required critical consumer missing;
- configuration invalid.

---

# 14. OBSERVABILITY

Create structured eventing logs.

Event names:

```text
event_claimed
event_contract_validated
event_dispatch_started
event_dispatch_succeeded
event_dispatch_failed
event_retry_scheduled
event_dead_lettered
event_no_subscription
relay_cycle_started
relay_cycle_completed
relay_cycle_failed
relay_started
relay_stopped
```

Required fields where applicable:

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
subscriptionId
attemptNumber
workerId
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
delivery_latency_ms
relay_cycle_duration_ms
relay_cycle_failure_total
consumer_timeout_total
consumer_success_total
consumer_failure_total
```

Use existing observability abstractions where available.

Do not add a heavy monitoring vendor dependency.

---

# 15. TENANT AND WORKSPACE SAFETY

Relay claiming may use privileged access.

Before consumer processing:

- derive tenant and workspace from the event;
- validate they are present;
- validate subscription authorization;
- pass the event to a tenant-scoped consumer context;
- never reuse one event’s tenant context for another event;
- prevent cross-tenant subscription dispatch.

Test context isolation between consecutive events from different tenants.

---

# 16. CONCURRENCY

Test:

- two workers claim different rows;
- one event is not double-claimed;
- stale claims are released;
- one slow event does not block unrelated batch events indefinitely;
- stop waits for current cycle within configured timeout;
- no overlapping `runOnce()` calls on the same worker.

Use `FOR UPDATE SKIP LOCKED` through the existing OutboxRepository.

---

# 17. TEST CONSUMERS

Create controlled test consumers:

```text
success_consumer
transient_failure_consumer
permanent_failure_consumer
timeout_consumer
duplicate_guard_consumer
```

These are test fixtures, not production domain handlers.

---

# 18. TESTS

## Unit tests

- configuration parsing;
- retry schedule;
- failure classification;
- consumer registry;
- duplicate registration;
- supported version resolution;
- timeout behavior;
- worker state transitions;
- health calculation;
- readiness failure conditions.

## Live PostgreSQL integration tests

- relay claims and publishes valid event;
- delivery attempt recorded;
- successful required subscription marks published;
- transient failure schedules retry;
- permanent failure dead-letters;
- maximum attempts dead-letter;
- unsupported event version dead-letters;
- two workers do not double-deliver;
- future event not delivered;
- stale claim released;
- no matching subscription follows configured policy;
- tenant A event not delivered to tenant B subscription;
- correlation and causation preserved;
- stop is graceful;
- failure of one event does not block others.

## Contract interaction tests

- valid Phase 1 event accepted;
- invalid payload rejected before dispatch;
- retired contract rejected;
- deprecated readable contract dispatches when supported.

Target:

```text
at least 80 meaningful tests
```

---

# 19. DOCUMENTATION

Create or update:

```text
docs/event-relay-worker.md
docs/event-in-process-adapter.md
docs/event-retry-classification.md
docs/event-health-readiness.md
docs/event-observability.md
docs/event-backbone-phase-3.md
apps/api/README.md
```

Document:

- relay lifecycle;
- configuration;
- claiming;
- subscription semantics;
- retries;
- dead letters;
- health;
- readiness;
- logs;
- metrics;
- test setup;
- what remains for Phase 4.

---

# 20. VALIDATION COMMANDS

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

Also run the API/eventing integration test command where configured.

Use PostgreSQL 16.

Do not use production credentials.

Do not claim completion unless all live tests pass.

---

# 21. PROHIBITED WORK

Do not implement:

- DA → BO domain consumer;
- BO → BI domain consumer;
- later vertical-slice handlers;
- n8n;
- webhook delivery;
- cloud queue;
- Kafka;
- RabbitMQ;
- dead-letter replay execution;
- replay UI;
- frontend;
- production deployment.

---

# 22. STOP CONDITION

Stop after:

1. relay worker exists;
2. consumer registry exists;
3. in-process adapter exists;
4. retry and failure classification exist;
5. delivery attempts are recorded;
6. dead-letter transition works;
7. health and readiness exist;
8. logs and metrics exist;
9. unit and live tests pass;
10. completion report is produced.

Do not begin Event Backbone Phase 4.

---

# 23. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 3 REPORT

Created:
- relay worker
- relay loop/coordinator
- consumer registry
- in-process adapter
- retry policy
- failure classifier
- health service
- readiness service
- observability
- configuration
- tests
- documentation

Modified:
- exact files
- reason

Validation:
- command
- result

Live PostgreSQL verification:
- batch claim
- concurrent workers
- successful dispatch
- retry scheduling
- permanent failure
- maximum attempts
- dead-letter transition
- delivery-attempt history
- stale-claim release
- tenant isolation
- workspace isolation
- graceful stop

Runtime totals:
- registered consumers
- subscriptions tested
- delivery attempts
- tests passing

Security:
- tenant-context separation
- subscription authorization
- payload redaction
- privileged claim separation

Not started:
- domain consumers
- replay execution
- external adapters
- n8n
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 4 — DA → BO first domain consumer
```
