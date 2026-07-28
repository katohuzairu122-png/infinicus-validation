# INFINICUS EVENT BACKBONE — PHASE 5 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–4 implementations and reports
6. Database Stage 2C Business Operations implementation
7. Database Stage 2D Business Intelligence implementation
8. Existing event-contract, handoff-contract, inbox, outbox, relay, and consumer patterns
9. Existing tenant-scoped PostgreSQL integration-test harness

## Objective

Implement Event Backbone Phase 5 only:

```text
BO → BI production domain consumer
```

Implement this cross-layer path:

```text
bo.data.published
→ validate BO publication package
→ validate bo-to-bi.operational-intelligence-package
→ persist BI intake package
→ register analytical dataset references
→ record inbox processing
→ persist handoff acknowledgement or rejection
→ emit bi.analysis.requested or the existing canonical BI intake event
```

Do not implement BI analysis, BI → DT, BI → SIM, BI → ADI, external adapters, replay execution, frontend, or broad BI block conversion.

Stop after the BO → BI intake vertical slice is live-tested.

---

# 1. Preconditions

Confirm:

- Event Backbone Phases 1–4 pass;
- `bo.data.published` contract exists;
- the selected BI intake event contract exists or is added through the Phase 1 registry pattern;
- `bo-to-bi.operational-intelligence-package` exists;
- BO publication package tables exist;
- BI intake and dataset tables exist;
- inbox, outbox, relay, consumer registry, and in-process adapter pass;
- Stage 2C and Stage 2D migrations are frozen;
- RLS is verified for BO and BI schemas.

Do not modify frozen migrations unless a live test proves a confirmed defect.

If Stage 2D has not been implemented, stop and report the missing prerequisite rather than creating BI persistence ad hoc.

---

# 2. Target structure

Create or complete:

```text
apps/api/src/eventing/consumers/bo-to-bi/
├── BoDataPublishedConsumer.ts
├── BoToBiHandoffValidator.ts
├── OperationalIntelligenceMapper.ts
├── BusinessIntelligenceIntakeService.ts
├── BoToBiConsumerDefinition.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/bo-to-bi/
├── bo-data-published.unit.test.ts
├── bo-to-bi-handoff.unit.test.ts
├── operational-intelligence-mapper.unit.test.ts
├── bo-to-bi.integration.test.ts
├── bo-to-bi-idempotency.integration.test.ts
├── bo-to-bi-rls.integration.test.ts
└── bo-to-bi-failure.integration.test.ts
```

Follow existing package and naming conventions when they differ.

---

# 3. Input event

Consume:

```text
bo.data.published
```

Expected minimum payload:

```ts
{
  publicationPackageId: string;
  targetLayer: "business_intelligence";
  reportingPeriod?: {
    start: string;
    end: string;
  };
  domains: string[];
  recordCount: number;
  qualityScore: number;
  limitations: unknown[];
}
```

Reject when:

- target layer is not `business_intelligence`;
- version unsupported;
- package missing;
- package not ready or already revoked;
- tenant/workspace/business mismatch;
- quality below policy;
- required domain references missing;
- reporting period invalid;
- provenance incomplete;
- critical limitation unresolved;
- duplicate package version already processed.

---

# 4. Handoff contract

Use:

```text
bo-to-bi.operational-intelligence-package
```

Expected payload:

```ts
{
  publicationPackageId: string;
  reportingPeriod?: {
    start: string;
    end: string;
  };
  operationalDomains: Array<{
    domain:
      | "sales"
      | "finance"
      | "procurement"
      | "inventory"
      | "fulfilment"
      | "workforce"
      | "workflow"
      | "assets"
      | "support"
      | "risk"
      | "incidents";
    recordCount: number;
    dataReference: string;
    qualityScore: number;
  }>;
  metricReferences?: string[];
  eventReferences?: string[];
}
```

Validate the full handoff envelope before domain writes.

Do not read arbitrary BO tables when the publication package already provides approved references.

---

# 5. Acceptance policy

Default thresholds:

```text
overall quality score >= 0.80
every declared domain quality score >= 0.70
no critical unresolved limitation
valid reporting period when supplied
valid provenance and publication references
matching tenant/workspace/business scope
```

Make thresholds configurable.

Rejection codes:

```text
unsupported_version
schema_invalid
tenant_mismatch
workspace_mismatch
business_scope_invalid
quality_below_threshold
domain_quality_below_threshold
reporting_period_invalid
provenance_incomplete
critical_limitation
duplicate_package
package_revoked
package_not_ready
domain_reference_missing
```

---

# 6. BI intake persistence

Persist into the existing Stage 2D BI schema using the actual table names defined there.

Expected logical records:

```text
BI data intake package
prepared dataset registrations or dataset references
domain-level quality records
source publication references
handoff receipt
processing status
```

Do not duplicate BO operational records inside BI.

Store references to BO publication data and controlled analytical copies only where the BI schema explicitly requires them.

The BI layer owns analytical preparation, not operational truth.

---

# 7. Operational intelligence mapper

Implement deterministic mapping from BO publication domains to BI intake records.

For each domain preserve:

```text
domain
record count
data reference
quality score
reporting period
source publication package
provenance reference
limitations
```

Rules:

- reject unknown domains;
- do not silently drop declared domains;
- normalize domains deterministically where required;
- preserve source references;
- do not convert missing data into zero without explicit meaning;
- preserve currency and unit metadata through references;
- do not perform analysis in the mapper.

---

# 8. BI intake service

Implement:

```ts
interface BusinessIntelligenceIntakeService {
  processBusinessOperationsPublication(
    event: PlatformEvent<BoDataPublishedPayload>,
    handoff: LayerHandoff<BusinessOperationsToBusinessIntelligencePayload>,
    context: TenantContext
  ): Promise<BusinessIntelligenceIntakeResult>;
}
```

Required transactional flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load BO publication package
→ verify status and ownership
→ apply quality and limitation policy
→ map domain references
→ create BI intake package
→ register prepared dataset inputs/references
→ persist handoff receipt
→ persist acknowledgement
→ enqueue BI intake event
→ mark inbox processed
→ commit
```

On failure:

```text
rollback
→ classify transient or permanent
→ persist rejection when permanent and contractually appropriate
→ return controlled error
```

---

# 9. Idempotency

Protect processing with:

```text
incoming event ID
consumer name
BO publication package ID
package version
target layer
BI intake package identity
```

Requirements:

- duplicate event does not duplicate BI intake;
- duplicate package version does not duplicate datasets;
- duplicate delivery does not emit duplicate BI intake event;
- new package version may create a new BI intake version;
- revoked package cannot process;
- acknowledged package returns idempotent no-op.

---

# 10. Outbound BI event

Use the canonical registered BI intake event.

Preferred event:

```text
bi.analysis.requested
```

If the current event catalogue and Phase 1 package use another canonical name for BI intake, use that existing event instead.

Minimum payload:

```ts
{
  intakePackageId: string;
  sourcePublicationPackageId: string;
  businessId: string;
  reportingPeriod?: {
    start: string;
    end: string;
  };
  domains: string[];
  datasetReferences: string[];
  requestedAt: string;
}
```

Envelope requirements:

- same tenant/workspace/business;
- same correlation ID;
- causation ID equals incoming `bo.data.published` event ID;
- aggregate type `bi_intake_package` or the existing canonical aggregate;
- aggregate ID equals BI intake package ID;
- registered event version;
- validated payload.

Emit transactionally.

Do not emit `bi.analysis.completed` in this phase.

---

# 11. Handoff acknowledgement and rejection

On success, persist and publish:

```text
platform.handoff.acknowledged
```

On permanent rejection, persist and publish:

```text
platform.handoff.rejected
```

Requirements:

- target record references include BI intake package ID;
- rejection includes safe reason;
- retryable flag accurate;
- acknowledgement and rejection are mutually exclusive for the same package version;
- preserve correlation and causation.

---

# 12. Controlled errors

Create:

```text
BusinessOperationsPublicationNotFoundError
BusinessOperationsPublicationNotReadyError
BusinessOperationsPublicationRevokedError
BusinessOperationsPublicationQualityError
BusinessOperationsDomainQualityError
BusinessOperationsProvenanceError
BusinessIntelligenceIntakeMappingError
BusinessIntelligenceScopeMismatchError
DuplicateBusinessIntelligenceIntakeError
InvalidReportingPeriodError
```

Do not expose raw BO payloads in errors.

---

# 13. Observability

Structured logs:

```text
bo_to_bi_received
bo_to_bi_validated
bo_to_bi_duplicate_ignored
bo_to_bi_intake_created
bo_to_bi_domain_registered
bo_to_bi_acknowledged
bo_to_bi_rejected
bo_to_bi_failed
```

Required fields:

```text
eventId
handoffId
publicationPackageId
intakePackageId
tenantId
workspaceId
businessId
correlationId
causationId
consumerName
domainCount
recordCount
durationMs
status
failureCode
```

Metrics:

```text
bo_to_bi_received_total
bo_to_bi_processed_total
bo_to_bi_rejected_total
bo_to_bi_duplicate_total
bo_to_bi_failure_total
bo_to_bi_domain_records_total
bo_to_bi_processing_seconds
```

---

# 14. Security

Requirements:

- no unscoped BO queries;
- tenant transaction required;
- event, handoff, package, and database scope must match;
- same-tenant cross-workspace access blocked;
- no raw customer or financial payloads copied into logs;
- restricted references remain protected;
- no credentials or files in BI intake payloads;
- application role cannot bypass RLS.

---

# 15. Tests

## Unit tests

- valid BO event;
- invalid target layer;
- quality threshold;
- domain quality threshold;
- reporting period validation;
- unknown domain rejected;
- deterministic mapping;
- limitations preserved;
- outbound BI event validates;
- acknowledgement validates;
- rejection validates.

## Live PostgreSQL integration tests

- valid BO package creates BI intake;
- domain references persisted;
- quality metadata persisted;
- duplicate event idempotent;
- duplicate package version idempotent;
- new package version creates new intake version;
- revoked package rejected;
- low-quality package rejected;
- low-quality domain rejected;
- invalid reporting period rejected;
- missing provenance rejected;
- tenant A cannot process tenant B package;
- same-tenant cross-workspace blocked;
- missing context fails closed;
- rollback removes BI intake and outbound event;
- canonical BI intake event emitted;
- causation ID equals BO event ID;
- correlation ID preserved;
- acknowledgement persisted;
- permanent rejection persisted;
- relay dispatch reaches BO → BI consumer;
- failure of BO → BI does not corrupt BO publication package.

## End-to-end test

```text
insert valid BO publication package
→ enqueue bo.data.published
→ relay runOnce()
→ BO → BI consumer
→ BI intake package persisted
→ domain dataset references registered
→ handoff acknowledged
→ BI intake event written to outbox
```

Target at least 50 meaningful tests.

---

# 16. Documentation

Create or update:

```text
docs/vertical-slices/bo-to-bi.md
docs/bo-to-bi-mapping.md
docs/bo-to-bi-quality-policy.md
docs/bo-to-bi-idempotency.md
docs/bo-to-bi-security.md
apps/api/README.md
```

Document the input event, handoff contract, accepted domains, quality policy, persistence mapping, transaction flow, idempotency, rejection, outbound BI intake event, observability, test setup, and what remains for BI analysis and BI → DT.

---

# 17. Validation commands

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

Run API/eventing integration tests against PostgreSQL 16.

Do not use production credentials.

Do not claim completion unless the end-to-end BO → BI test passes.

---

# 18. Prohibited work

Do not implement:

- BI analysis execution;
- metric calculation;
- forecast generation;
- anomaly detection;
- BI → DT consumer;
- BI → SIM consumer;
- BI → ADI consumer;
- later layer consumers;
- external adapters;
- replay execution;
- frontend;
- broad BI TypeScript conversion.

---

# 19. Stop condition

Stop after:

1. BO → BI consumer exists;
2. event and handoff validation work;
3. BI intake persistence works;
4. domain mapping works;
5. idempotency works;
6. acknowledgement and rejection work;
7. outbound BI intake event works;
8. RLS and rollback tests pass;
9. relay end-to-end test passes;
10. documentation is complete;
11. completion report is produced.

Do not begin Event Backbone Phase 6.

---

# 20. Completion report format

Return:

```text
EVENT BACKBONE PHASE 5 REPORT

Created:
- BO → BI consumer
- handoff validator
- mapper
- BI intake service
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
- BO package inserted
- bo.data.published enqueued
- relay dispatch
- BI intake created
- dataset references registered
- handoff acknowledged
- BI intake event emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation

Totals:
- consumers
- accepted domains
- integration tests
- tests passing

Security:
- scoped BO access
- restricted-reference handling
- payload redaction
- RLS status

Not started:
- BI analysis engine
- BI → DT consumer
- remaining vertical-slice consumers
- replay execution
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 6 — BI → DT consumer
```
