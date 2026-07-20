# INFINICUS EVENT BACKBONE — PHASE 4 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phase 1 implementation and report
6. Event Backbone Phase 2 implementation and report
7. Event Backbone Phase 3 implementation and report
8. Database Stage 2B Data Acquisition implementation
9. Database Stage 2C Business Operations implementation
10. Existing handoff-contract and event-contract packages
11. Existing tenant transaction, inbox, outbox, relay, and consumer registry patterns

## Objective

Implement Event Backbone Phase 4 only:

```text
DA → BO first production domain consumer
```

Implement the first real cross-layer event and handoff path:

```text
da.data.published
→ validate DA publication package
→ create or update BO business profile and operating context
→ record inbox processing
→ persist BO handoff record
→ emit bo.business_profile.updated
→ optionally emit bo.data.published when the resulting BO package is ready
```

Do not implement:

- BO → BI consumer;
- BI → DT;
- DT → SIM;
- SIM → ADI;
- ADI → ABA;
- ABA → OM;
- OM → CL;
- external event adapters;
- replay execution;
- frontend;
- unrelated block conversion.

Stop after the DA → BO vertical slice is live-tested.

---

# 1. PRECONDITIONS

Confirm:

- Event Backbone Phases 1–3 pass;
- `da.data.published` contract exists;
- `bo.business_profile.updated` contract exists;
- DA publication packages exist;
- BO business profile and operating context tables exist;
- inbox and outbox repositories work;
- relay and in-process adapter work;
- tenant and workspace RLS is verified;
- Stage 2B and Stage 2C migration ranges are frozen.

Do not modify frozen migrations unless a live test proves a confirmed defect.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
apps/api/src/eventing/consumers/da-to-bo/
├── DaDataPublishedConsumer.ts
├── DaToBoHandoffValidator.ts
├── BusinessIntakeMapper.ts
├── BusinessIntakeService.ts
├── DaToBoConsumerDefinition.ts
├── errors.ts
└── index.ts
```

Repositories or adapters may be added under existing package conventions.

Tests:

```text
apps/api/tests/eventing/da-to-bo/
├── da-data-published.unit.test.ts
├── da-to-bo-handoff.unit.test.ts
├── business-intake-mapper.unit.test.ts
├── da-to-bo.integration.test.ts
├── da-to-bo-idempotency.integration.test.ts
├── da-to-bo-rls.integration.test.ts
└── da-to-bo-failure.integration.test.ts
```

---

# 3. INPUT EVENT

Consume:

```text
da.data.published
```

Expected payload:

```ts
{
  publicationPackageId: string;
  targetLayer: "business_operations";
  recordCount: number;
  qualityScore: number;
  reliabilityScore: number;
  schemaReferenceId?: string;
  limitations: unknown[];
}
```

Reject the event when:

- target layer is not `business_operations`;
- event version unsupported;
- publication package missing;
- tenant or workspace mismatch;
- business scope invalid;
- package status is not publishable;
- quality below policy threshold;
- provenance incomplete;
- critical validation issue unresolved;
- package revoked;
- payload invalid.

---

# 4. HANDOFF CONTRACT

Use:

```text
da-to-bo.business-intake-package
```

The consumer must validate the handoff envelope and payload before applying domain changes.

Required payload areas:

```text
publicationPackageId
dataSourceIds
collectionRunIds
businessIdentity optional
operatingContext optional
operationalRecords
schemaReferenceId
```

Do not bypass the handoff contract by reading arbitrary DA tables directly.

The DA publication package remains source-owned and immutable.

---

# 5. ACCEPTANCE POLICY

Default minimums:

```text
overall quality score >= 0.80
source reliability score >= 0.70
no critical unresolved limitation
valid provenance reference
valid tenant/workspace/business scope
```

Thresholds must be configurable through policy or environment-backed configuration.

Do not hard-code tenant-specific policy into domain code.

Rejection codes:

```text
unsupported_version
schema_invalid
tenant_mismatch
workspace_mismatch
business_scope_invalid
quality_below_threshold
reliability_below_threshold
provenance_incomplete
critical_limitation
duplicate_package
package_revoked
package_not_ready
```

---

# 6. MAPPING RULES

Implement a deterministic `BusinessIntakeMapper`.

Map only approved fields.

## Business identity

Use canonical:

```text
platform.businesses
```

Do not create duplicate business identity rows when an authoritative business already exists.

Allowed updates may include:

```text
trading_name
industry
legal_structure
business_model
status only through valid transition
```

Do not overwrite legal identity from low-confidence source data.

## Business profile

Persist or update:

```text
business_operations.business_profiles
```

Potential fields:

```text
operating_model
customer_model
revenue_model
supply_model
operating_stage
employee_band
location_count
default_currency
default_timezone
```

## Operating context

Persist versioned context in:

```text
business_operations.operating_contexts
```

Examples:

```text
market context
operating hours
location context
customer model
supply model
currency context
```

Do not overwrite historical context. Create a new effective version when required.

---

# 7. BUSINESS INTAKE SERVICE

Implement a transactional service:

```ts
interface BusinessIntakeService {
  processDataPublished(
    event: PlatformEvent<DaDataPublishedPayload>,
    handoff: LayerHandoff<DataAcquisitionToBusinessOperationsPayload>,
    context: TenantContext
  ): Promise<BusinessIntakeResult>;
}
```

Required flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load DA publication package
→ verify ownership and status
→ map approved fields
→ create/update BO profile
→ create BO operating-context version
→ record handoff receipt
→ record acknowledgement
→ enqueue bo.business_profile.updated
→ optionally create BO publication package
→ mark inbox processed
→ commit
```

On any failure:

```text
rollback all domain and outbox changes
→ classify failure
→ return controlled error
```

---

# 8. IDEMPOTENCY

Use:

```text
(event_id, consumer_name)
```

Also protect domain processing with:

```text
source publication package ID
handoff package version
business ID
target layer
```

Requirements:

- duplicate delivery does not duplicate business profile;
- duplicate delivery does not duplicate operating context version;
- duplicate delivery does not emit duplicate BO events;
- a new package version may update the business;
- revoked package cannot process;
- already acknowledged package returns idempotent no-op.

---

# 9. OUTBOUND EVENT

Emit:

```text
bo.business_profile.updated
```

Required payload minimum:

```ts
{
  businessProfileId: string;
  businessId: string;
  profileVersion: number;
  changedFields: string[];
  sourcePublicationPackageId: string;
  updatedAt: string;
}
```

Envelope requirements:

- same tenant;
- same workspace;
- same business;
- same correlation ID;
- causation ID equals incoming DA event ID;
- aggregate type `business_profile`;
- aggregate ID equals BO business profile ID;
- event version registered;
- payload validates.

Emit transactionally with the BO update.

---

# 10. OPTIONAL BO PUBLICATION

Only when a valid BO publication package is created in the same workflow, emit:

```text
bo.data.published
```

Do not emit it merely because a profile update occurred.

The package must meet BO publication readiness rules.

---

# 11. HANDOFF ACKNOWLEDGEMENT

Persist and publish:

```text
platform.handoff.acknowledged
```

Payload:

```text
handoffId
packageId
sourceLayer
targetLayer
receivedVersion
processedAt
targetRecordReferences
```

On permanent rejection, persist and publish:

```text
platform.handoff.rejected
```

Do not acknowledge and reject the same handoff version.

---

# 12. ERROR TYPES

Create controlled errors:

```text
DataPublicationPackageNotFoundError
DataPublicationPackageNotReadyError
DataPublicationPackageRevokedError
DataPublicationQualityError
DataPublicationReliabilityError
DataPublicationProvenanceError
BusinessIntakeMappingError
BusinessScopeMismatchError
DuplicateBusinessIntakeError
```

Errors must expose safe codes and omit raw source payloads.

---

# 13. OBSERVABILITY

Structured logs:

```text
da_to_bo_received
da_to_bo_validated
da_to_bo_duplicate_ignored
da_to_bo_profile_created
da_to_bo_profile_updated
da_to_bo_context_created
da_to_bo_acknowledged
da_to_bo_rejected
da_to_bo_failed
```

Required fields:

```text
eventId
handoffId
publicationPackageId
tenantId
workspaceId
businessId
correlationId
causationId
consumerName
durationMs
status
failureCode
```

Metrics:

```text
da_to_bo_received_total
da_to_bo_processed_total
da_to_bo_rejected_total
da_to_bo_duplicate_total
da_to_bo_failure_total
da_to_bo_processing_seconds
```

---

# 14. SECURITY

Requirements:

- no direct unscoped DA queries;
- all reads and writes use tenant transaction context;
- same-tenant cross-workspace access blocked;
- event scope must match package scope;
- handoff scope must match event scope;
- do not copy sensitive raw records into BO;
- restricted fields require explicit mapping policy;
- no credentials or file bodies in BO profile data;
- error logs must not contain raw DA payloads.

---

# 15. TESTS

## Unit tests

- valid event mapping;
- invalid target layer rejected;
- quality threshold;
- reliability threshold;
- critical limitation rejection;
- deterministic mapper;
- unsupported field ignored;
- legal identity protected from low-confidence overwrite;
- outbound event payload valid;
- acknowledgement payload valid.

## Live PostgreSQL integration tests

- valid DA publication creates BO profile;
- valid package creates operating context;
- existing profile updates with version increment;
- duplicate event is idempotent;
- duplicate package version is idempotent;
- new package version updates;
- rollback removes BO changes and outbound event;
- tenant A cannot process tenant B package;
- same-tenant cross-workspace processing blocked;
- missing context fails closed;
- low-quality package rejected;
- revoked package rejected;
- missing provenance rejected;
- `bo.business_profile.updated` emitted;
- causation ID equals DA event ID;
- correlation ID preserved;
- handoff acknowledgement persisted;
- permanent rejection emits handoff rejection;
- no duplicate outbound event on redelivery;
- relay dispatch reaches the registered DA → BO consumer.

## End-to-end test

Execute:

```text
insert valid DA publication package
→ enqueue da.data.published
→ relay runOnce()
→ DA → BO consumer
→ BO profile persisted
→ handoff acknowledged
→ bo.business_profile.updated in outbox
```

Target:

```text
at least 50 meaningful tests
```

---

# 16. DOCUMENTATION

Create or update:

```text
docs/vertical-slices/da-to-bo.md
docs/da-to-bo-mapping.md
docs/da-to-bo-quality-policy.md
docs/da-to-bo-idempotency.md
docs/da-to-bo-security.md
apps/api/README.md
```

Document:

- event contract;
- handoff contract;
- acceptance thresholds;
- mapping;
- transaction flow;
- idempotency;
- rejection;
- observability;
- test setup;
- what remains for BO → BI.

---

# 17. VALIDATION COMMANDS

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

Run the API/eventing integration suite against PostgreSQL 16.

Do not use production credentials.

Do not claim completion unless the end-to-end DA → BO test passes.

---

# 18. PROHIBITED WORK

Do not implement:

- BO → BI consumer;
- BI analytics logic;
- DT synchronization;
- Simulation intake;
- ADI;
- ABA;
- OM;
- CL;
- external adapters;
- replay execution;
- frontend;
- broad BO TypeScript conversion.

---

# 19. STOP CONDITION

Stop after:

1. DA → BO consumer exists;
2. event and handoff validation work;
3. BO profile and context persistence work;
4. idempotency works;
5. acknowledgement and rejection work;
6. outbound BO event works;
7. RLS and rollback tests pass;
8. relay end-to-end test passes;
9. documentation is complete;
10. completion report is produced.

Do not begin Event Backbone Phase 5.

---

# 20. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 4 REPORT

Created:
- DA → BO consumer
- handoff validator
- mapper
- business intake service
- consumer registration
- errors
- tests
- documentation

Modified:
- exact files
- reason

Validation:
- command
- result

End-to-end verification:
- DA package inserted
- da.data.published enqueued
- relay dispatch
- BO profile created/updated
- operating context versioned
- handoff acknowledged
- bo.business_profile.updated emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation

Totals:
- consumers
- mappings
- integration tests
- tests passing

Security:
- scoped DA access
- restricted-field handling
- payload redaction
- RLS status

Not started:
- BO → BI consumer
- remaining vertical-slice consumers
- replay execution
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 5 — BO → BI consumer
```
