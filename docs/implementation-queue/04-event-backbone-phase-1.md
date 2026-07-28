# INFINICUS EVENT BACKBONE — PHASE 1 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Existing `packages/event-contracts`
6. Existing `packages/handoff-contracts`
7. Existing shared types and database conventions

## Objective

Implement Event Backbone Phase 1 only:

- canonical event envelope;
- canonical event metadata;
- platform-layer identifiers;
- event contract registry;
- Zod runtime validation;
- initial event contract set;
- handoff acknowledgement, rejection, and revocation contracts;
- unit tests;
- package documentation.

Do not implement:

- outbox repository;
- inbox repository;
- relay worker;
- delivery adapters;
- consumers;
- dead-letter replay;
- external brokers;
- n8n integration;
- event database migrations;
- frontend pages.

Stop after Phase 1 contracts and tests are complete.

---

# 1. TARGET PACKAGE STRUCTURE

Use:

```text
packages/event-contracts/
├── src/
│   ├── envelope.ts
│   ├── metadata.ts
│   ├── layers.ts
│   ├── registry.ts
│   ├── validators.ts
│   ├── errors.ts
│   ├── versions.ts
│   ├── events/
│   │   ├── da/
│   │   ├── bo/
│   │   ├── bi/
│   │   ├── dt/
│   │   ├── sim/
│   │   ├── adi/
│   │   ├── aba/
│   │   ├── om/
│   │   ├── cl/
│   │   └── platform/
│   └── index.ts
├── tests/
├── README.md
├── package.json
└── tsconfig.json
```

Use existing repository conventions where they differ.

Do not duplicate shared identifiers already defined in `packages/shared-types`.

---

# 2. CANONICAL PLATFORM LAYERS

Define one canonical layer enum or union:

```text
data_acquisition
business_operations
business_intelligence
business_digital_twin
simulation
ai_decision_intelligence
approved_business_action
outcome_monitoring
continuous_learning
platform
```

Do not create separate incompatible layer types in multiple packages.

---

# 3. CANONICAL EVENT ENVELOPE

Implement a generic typed event envelope.

Required fields:

```ts
interface PlatformEvent<TPayload> {
  id: string;
  eventType: string;
  eventVersion: number;

  tenantId: string;
  workspaceId: string;
  businessId?: string;

  aggregateType: string;
  aggregateId: string;

  correlationId: string;
  causationId?: string;

  producerLayer: PlatformLayer;
  producerBlock?: string;

  occurredAt: string;
  publishedAt?: string;

  payload: TPayload;
  metadata: EventMetadata;
}
```

Validation rules:

- UUID fields must validate as UUIDs;
- event type must follow canonical naming;
- event version must be a positive integer;
- aggregate type and ID required;
- correlation ID required;
- ISO timestamps required;
- publishedAt cannot precede occurredAt;
- payload must match registered event schema;
- sensitivity must be valid;
- unknown required fields must be rejected where strict schemas are appropriate.

---

# 4. EVENT METADATA

Implement:

```ts
interface EventMetadata {
  sourceSystem: string;
  sourceRecordId?: string;
  traceId?: string;
  actorType?: "user" | "service_account" | "system" | "integration";
  actorId?: string;
  schemaName: string;
  schemaVersion: number;
  idempotencyKey?: string;
  retryCount?: number;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
}
```

Constraints:

- schema version positive integer;
- retry count non-negative;
- source system non-empty;
- schema name non-empty;
- no raw secrets;
- idempotency key bounded in length.

---

# 5. EVENT NAMING VALIDATION

Canonical format:

```text
<layer>.<domain>.<past-tense-action>
```

Examples:

```text
da.data.published
bo.order.created
bi.analysis.completed
dt.state.updated
sim.simulation.completed
adi.decision.generated
aba.action.approved
om.outcome.recorded
cl.learning.published
platform.handoff.acknowledged
```

Reject:

```text
BO.Order.Created
bo_create_order
complete.order
prod.bo.order.created
```

Implement a reusable event-name validator.

---

# 6. EVENT CONTRACT REGISTRY

Implement a registry capable of:

```ts
register(contract)
get(eventType, eventVersion)
validate(event)
listActive()
listDeprecated()
supports(eventType, eventVersion)
```

Each contract registration must contain:

```text
eventType
eventVersion
schemaName
producerLayer
producerBlock optional
supportedConsumers
status
effectiveFrom
deprecatedAt optional
payloadSchema
```

Statuses:

```text
draft
active
deprecated
retired
```

Rules:

- duplicate event type/version registration rejected;
- unknown event rejected;
- unsupported version rejected;
- retired contract rejected for new publication;
- deprecated contract remains readable;
- active registry initialization deterministic;
- no implicit fallback to another version.

---

# 7. ERROR TYPES

Create controlled errors:

```text
UnknownEventTypeError
UnsupportedEventVersionError
DuplicateContractRegistrationError
InvalidEventEnvelopeError
InvalidEventPayloadError
RetiredEventContractError
EventSchemaValidationError
```

Errors must expose:

```text
code
message
eventType optional
eventVersion optional
validationIssues optional
```

Do not leak secrets or full sensitive payloads into error messages.

---

# 8. INITIAL EVENT CONTRACT SET

Implement exactly these initial contracts.

## Data Acquisition

```text
da.data.published
```

Payload minimum:

```ts
{
  publicationPackageId: string;
  targetLayer: "business_operations" | "business_intelligence";
  recordCount: number;
  qualityScore: number;
  reliabilityScore: number;
  schemaReferenceId?: string;
  limitations: unknown[];
}
```

## Business Operations

```text
bo.business_profile.updated
bo.order.created
bo.order.completed
bo.payment.recorded
bo.inventory.adjusted
bo.data.published
```

## Business Intelligence

```text
bi.analysis.completed
```

## Business Digital Twin

```text
dt.state.updated
```

## Simulation

```text
sim.simulation.completed
```

## AI Decision Intelligence

```text
adi.decision.generated
```

## Approved Business Action

```text
aba.action.approved
aba.action.executed
```

## Outcome Monitoring

```text
om.outcome.recorded
```

## Continuous Learning

```text
cl.learning.published
```

## Platform handoff lifecycle

```text
platform.handoff.acknowledged
platform.handoff.rejected
platform.handoff.revoked
```

Total initial event contracts:

```text
18
```

Do not implement the full catalogue in this phase.

---

# 9. PAYLOAD VALIDATION REQUIREMENTS

Use Zod.

Common rules:

- identifiers non-empty and UUID where the domain requires UUID;
- scores and confidence between 0 and 1;
- counts non-negative integers;
- timestamps valid ISO strings;
- required arrays present;
- known enums strict;
- unknown version rejected;
- limitations represented explicitly;
- no `any` in exported contract types.

Generate TypeScript payload types from Zod schemas where practical.

Do not maintain separate manually drifting schema and type definitions.

---

# 10. HANDOFF LIFECYCLE CONTRACTS

Implement:

## `platform.handoff.acknowledged`

Required fields:

```text
handoffId
packageId
sourceLayer
targetLayer
receivedVersion
processedAt
targetRecordReferences
```

## `platform.handoff.rejected`

Required fields:

```text
handoffId
packageId
sourceLayer
targetLayer
rejectionCode
rejectionMessage
retryable
rejectedAt
validationErrors optional
```

## `platform.handoff.revoked`

Required fields:

```text
handoffId
packageId
packageVersion
reason
revokedAt
replacementPackageId optional
```

Use shared layer identifiers.

---

# 11. VERSIONING UTILITIES

Implement utilities for:

```text
isSupportedVersion
assertSupportedVersion
compareEventVersions
isDeprecatedContract
isRetiredContract
```

Do not implement automatic payload migration in Phase 1.

---

# 12. PUBLIC EXPORTS

The package root must export:

- PlatformEvent;
- EventMetadata;
- PlatformLayer;
- event envelope schema;
- metadata schema;
- registry;
- all initial payload schemas;
- all initial payload types;
- event contract definitions;
- error classes;
- version utilities;
- validation functions.

Avoid deep-import requirements for consumers.

---

# 13. TESTS

Create comprehensive unit tests.

## Envelope tests

- valid event accepted;
- invalid UUID rejected;
- missing correlation ID rejected;
- missing aggregate rejected;
- invalid event name rejected;
- version zero rejected;
- invalid timestamp rejected;
- publishedAt before occurredAt rejected;
- invalid sensitivity rejected;
- negative retry count rejected.

## Registry tests

- register valid contract;
- duplicate registration rejected;
- retrieve active contract;
- unknown event rejected;
- unsupported version rejected;
- retired contract rejected for publication;
- deprecated contract readable;
- active list correct;
- deprecated list correct.

## Payload tests

For all 18 contracts:

- valid payload accepted;
- missing required field rejected;
- invalid enum rejected;
- invalid score rejected;
- invalid count rejected where applicable.

## Security tests

- error output does not expose full payload;
- metadata does not allow unsupported sensitivity;
- secret-like fields are not part of canonical contracts.

## Export tests

- all required public exports resolve;
- no circular import failure;
- package builds cleanly.

Target:

```text
at least 100 meaningful tests
```

Do not create repetitive tests solely to inflate counts.

---

# 14. DOCUMENTATION

Create or update:

```text
packages/event-contracts/README.md
docs/event-contract-registry.md
docs/event-contract-versioning.md
docs/event-contract-security.md
docs/event-contract-initial-set.md
```

Document:

- envelope;
- metadata;
- naming rules;
- registration;
- validation;
- versioning;
- deprecation;
- retirement;
- security;
- initial event list;
- examples;
- what remains for Phase 2.

---

# 15. VALIDATION COMMANDS

Run:

```bash
pnpm install
pnpm workspace:validate
pnpm --filter @infinicus/event-contracts lint
pnpm --filter @infinicus/event-contracts typecheck
pnpm --filter @infinicus/event-contracts test
pnpm --filter @infinicus/event-contracts build
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use the actual package name if it differs.

Do not claim completion unless all applicable commands pass.

---

# 16. PROHIBITED WORK

Do not implement:

- database outbox repositories;
- inbox repositories;
- relay workers;
- polling loops;
- broker adapters;
- webhooks;
- n8n;
- event consumers;
- dead-letter replay;
- event database migrations;
- application endpoints;
- frontend UI;
- later database stages.

---

# 17. STOP CONDITION

Stop after:

1. canonical event envelope exists;
2. metadata exists;
3. layer identifiers exist;
4. registry exists;
5. 18 initial contracts exist;
6. runtime validation exists;
7. tests pass;
8. documentation is complete;
9. completion report is produced.

Do not begin Event Backbone Phase 2.

---

# 18. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 1 REPORT

Created:
- package files
- schemas
- types
- registry
- validators
- errors
- initial event contracts
- tests
- documentation

Modified:
- exact files
- reason

Validation:
- command
- result

Contract totals:
- event contracts
- payload schemas
- registry entries
- tests passing

Versioning:
- unknown event handling
- unsupported version handling
- deprecated contract handling
- retired contract handling

Security:
- sensitivity validation
- secret-field status
- error redaction status

Not started:
- outbox repository
- inbox repository
- relay worker
- consumers
- replay
- external adapters

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 2 — database repositories
```
