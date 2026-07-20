# INFINICUS EVENT BACKBONE — PHASE 6 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–5 implementations and reports
6. Database Stage 2D Business Intelligence implementation
7. Database Stage 2E Business Digital Twin implementation
8. Existing event-contract, handoff-contract, inbox, outbox, relay, and consumer patterns
9. Existing tenant-scoped PostgreSQL integration-test harness
10. `INFINICUS-DIGITAL-TWIN-BLOCK-AUDIT.md` and its final decision

## Objective

Implement Event Backbone Phase 6 only:

```text
BI → DT production domain consumer
```

Implement the cross-layer path:

```text
bi.analysis.completed
→ validate BI analysis package
→ validate bi-to-dt.intelligence-state-package
→ persist or update Digital Twin analytical state
→ version twin state and evidence references
→ record inbox processing
→ acknowledge or reject handoff
→ emit dt.state.updated
```

Do not implement BI → SIM, BI → ADI, DT → SIM, DT → ADI, twin calibration, simulation execution, external adapters, replay execution, frontend, or broad Digital Twin conversion.

Stop after the BI → DT vertical slice is live-tested.

## 1. Preconditions

Confirm:

- Event Backbone Phases 1–5 pass;
- `bi.analysis.completed` and `dt.state.updated` contracts exist;
- `bi-to-dt.intelligence-state-package` exists;
- Stage 2D BI analysis-result persistence exists;
- Stage 2E Digital Twin tables exist;
- the Digital Twin block audit has a documented decision;
- inbox, outbox, relay, and in-process adapter pass;
- Stage 2D and Stage 2E migration ranges are frozen;
- BI and DT RLS policies pass.

If Stage 2E has not been implemented, stop and report the missing prerequisite. Do not create Digital Twin tables ad hoc.

## 2. Target structure

```text
apps/api/src/eventing/consumers/bi-to-dt/
├── BiAnalysisCompletedConsumer.ts
├── BiToDtHandoffValidator.ts
├── IntelligenceStateMapper.ts
├── DigitalTwinStateUpdateService.ts
├── BiToDtConsumerDefinition.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/bi-to-dt/
├── bi-analysis-completed.unit.test.ts
├── bi-to-dt-handoff.unit.test.ts
├── intelligence-state-mapper.unit.test.ts
├── bi-to-dt.integration.test.ts
├── bi-to-dt-idempotency.integration.test.ts
├── bi-to-dt-rls.integration.test.ts
└── bi-to-dt-failure.integration.test.ts
```

## 3. Input event

Consume `bi.analysis.completed` with minimum payload:

```ts
{
  analysisId: string;
  intakePackageId: string;
  businessId: string;
  analysisType: string;
  resultPackageId: string;
  confidenceScore: number;
  completedAt: string;
  limitations: unknown[];
}
```

Reject unsupported versions, missing/revoked packages, incomplete analysis, scope mismatch, low confidence, incomplete provenance, critical limitations, missing target twin, and duplicate processed package versions.

## 4. Handoff contract

Use `bi-to-dt.intelligence-state-package`.

Expected payload:

```ts
{
  resultPackageId: string;
  analysisId: string;
  businessId: string;
  effectiveAt: string;
  intelligenceFindings: Array<{
    findingId: string;
    category: string;
    subjectReference: string;
    metricReference?: string;
    value?: unknown;
    confidenceScore: number;
    evidenceReferences: string[];
    limitations: unknown[];
  }>;
  trendReferences?: string[];
  anomalyReferences?: string[];
  forecastReferences?: string[];
  qualityScore: number;
}
```

Validate the handoff before Digital Twin writes. Do not bypass it by scanning arbitrary BI tables.

## 5. Acceptance policy

Defaults:

```text
overall package quality >= 0.80
analysis confidence >= 0.75
each finding confidence >= 0.65
no critical unresolved limitation
valid provenance and effective timestamp
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
analysis_not_completed
package_not_found
package_revoked
quality_below_threshold
confidence_below_threshold
finding_confidence_below_threshold
provenance_incomplete
critical_limitation
invalid_effective_time
digital_twin_not_found
duplicate_package
```

## 6. Ownership boundaries

BI provides analytical evidence only. Digital Twin owns registry, entities, relationships, current state, state history, transitions, assumptions, constraints, snapshots, divergence, calibration, and publication.

BI must not directly control twin lifecycle, entity deletion, relationship deletion, calibration approval, simulation, or action approval.

## 7. Intelligence-state mapper

Map each accepted finding while preserving finding ID, category, subject reference, metric reference, value, confidence, evidence references, limitations, effective timestamp, result package, and analysis ID.

Rules:

- only recognized categories update typed state;
- unknown critical categories are rejected;
- non-critical unknown categories may be retained as unsupported evidence only when policy allows;
- missing values are not converted to zero;
- units, currency, timestamps, confidence, and provenance are preserved;
- no simulation or recommendation logic;
- older weaker evidence cannot overwrite newer stronger state.

## 8. State precedence

Apply:

1. newer effective time outranks older;
2. equal time uses higher confidence;
3. equal time and confidence uses deterministic source ordering;
4. lower-confidence evidence may be retained without replacing current state;
5. revoked results cannot update state;
6. critical conflicts create conflict/divergence records;
7. every accepted change creates state history.

Historical state is immutable.

## 9. Digital Twin state-update service

```ts
interface DigitalTwinStateUpdateService {
  processAnalysisCompleted(
    event: PlatformEvent<BiAnalysisCompletedPayload>,
    handoff: LayerHandoff<BusinessIntelligenceToDigitalTwinPayload>,
    context: TenantContext
  ): Promise<DigitalTwinStateUpdateResult>;
}
```

Transactional flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load and verify BI result package
→ load target Digital Twin
→ map findings
→ create state-history entries
→ update eligible current state
→ persist evidence references
→ persist conflicts/divergence where required
→ persist handoff receipt
→ acknowledge handoff
→ enqueue dt.state.updated
→ mark inbox processed
→ commit
```

Any failure must roll back domain and outbox changes.

## 10. Idempotency

Protect with incoming event ID, consumer name, BI result package ID/version, analysis ID, Digital Twin ID, and target state version.

Duplicate delivery must not duplicate state history, evidence links, or outbound events. New package versions may create new state versions. Revoked packages cannot process.

## 11. Outbound event

Emit `dt.state.updated` with minimum payload:

```ts
{
  digitalTwinId: string;
  businessId: string;
  stateVersion: number;
  changedEntityReferences: string[];
  changedStateKeys: string[];
  sourceAnalysisId: string;
  sourceResultPackageId: string;
  effectiveAt: string;
  confidenceScore: number;
  updatedAt: string;
}
```

Use the same tenant, workspace, business, and correlation ID. Set causation ID to the incoming BI event ID. Aggregate type is `digital_twin`; aggregate ID is the Digital Twin ID. Emit transactionally.

## 12. Conflict and divergence handling

Create conflict/divergence records when high-confidence findings disagree, evidence violates hard constraints, change exceeds tolerance, evidence is stale, or entity mapping is ambiguous.

Do not calibrate automatically. Do not emit `dt.calibration.completed`.

## 13. Handoff lifecycle

On success persist and publish `platform.handoff.acknowledged`.

On permanent failure persist and publish `platform.handoff.rejected`.

Target references include Digital Twin ID, state version, state-history IDs, and conflict/divergence IDs where present. Acknowledgement and rejection are mutually exclusive per package version.

## 14. Controlled errors

Create:

```text
BusinessIntelligenceResultNotFoundError
BusinessIntelligenceResultNotCompletedError
BusinessIntelligenceResultRevokedError
BusinessIntelligenceQualityError
BusinessIntelligenceConfidenceError
BusinessIntelligenceProvenanceError
DigitalTwinNotFoundError
DigitalTwinStateMappingError
DigitalTwinStateConflictError
DigitalTwinScopeMismatchError
DuplicateDigitalTwinStateUpdateError
InvalidEffectiveTimestampError
```

Do not expose raw analytical payloads or confidential evidence.

## 15. Observability

Logs:

```text
bi_to_dt_received
bi_to_dt_validated
bi_to_dt_duplicate_ignored
bi_to_dt_state_history_created
bi_to_dt_current_state_updated
bi_to_dt_conflict_recorded
bi_to_dt_divergence_recorded
bi_to_dt_acknowledged
bi_to_dt_rejected
bi_to_dt_failed
```

Metrics:

```text
bi_to_dt_received_total
bi_to_dt_processed_total
bi_to_dt_rejected_total
bi_to_dt_duplicate_total
bi_to_dt_failure_total
bi_to_dt_conflict_total
bi_to_dt_divergence_total
bi_to_dt_state_changes_total
bi_to_dt_processing_seconds
```

Include event, handoff, analysis, result package, twin, tenant, workspace, business, correlation, causation, counts, version, duration, status, and safe failure code.

## 16. Security

- tenant transaction required;
- event, handoff, result, and twin scopes must match;
- cross-workspace access blocked;
- confidential evidence is referenced, not logged;
- no prompts, credentials, or file bodies copied into twin state;
- restricted findings follow classification policy;
- application role cannot bypass RLS.

## 17. Tests

Unit tests must cover validation, thresholds, timestamps, deterministic mapping, precedence, stale evidence, conflicts, outbound event, acknowledgement, and rejection.

Live PostgreSQL tests must cover:

- valid result updates twin state;
- state history and evidence persist;
- state version increments;
- duplicate event/package idempotency;
- new package version creates new state version;
- revoked, low-quality, low-confidence, and provenance-deficient packages are rejected;
- old weaker evidence does not replace current state;
- stronger equal-time evidence follows policy;
- conflicts create conflict records;
- tenant/workspace isolation and fail-closed behavior;
- rollback removes state and outbound event;
- correlation and causation preservation;
- acknowledgement/rejection persistence;
- relay reaches the BI → DT consumer.

End-to-end:

```text
insert valid BI result package
→ enqueue bi.analysis.completed
→ relay runOnce()
→ BI → DT consumer
→ twin state history persisted
→ current state updated
→ handoff acknowledged
→ dt.state.updated written to outbox
```

Target at least 55 meaningful tests.

## 18. Documentation

Create or update:

```text
docs/vertical-slices/bi-to-dt.md
docs/bi-to-dt-mapping.md
docs/digital-twin-state-precedence.md
docs/bi-to-dt-quality-policy.md
docs/bi-to-dt-idempotency.md
docs/bi-to-dt-security.md
apps/api/README.md
```

## 19. Validation commands

```bash
pnpm install
pnpm workspace:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @infinicus/database test:integration
```

Run API/eventing tests against PostgreSQL 16. Do not use production credentials. Do not claim completion unless the BI → DT end-to-end test passes.

## 20. Stop condition

Stop after the BI → DT consumer, validation, state history, current-state policy, conflict/divergence handling, idempotency, handoff lifecycle, outbound event, RLS, rollback, end-to-end tests, documentation, and completion report are finished.

Do not begin Phase 7.

## 21. Completion report

Return:

```text
EVENT BACKBONE PHASE 6 REPORT

Created:
- BI → DT consumer
- handoff validator
- intelligence-state mapper
- Digital Twin state-update service
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
- BI result package inserted
- bi.analysis.completed enqueued
- relay dispatch
- twin state history created
- current state updated
- conflicts/divergence handled
- handoff acknowledged
- dt.state.updated emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation

Totals:
- consumers
- findings mapped
- state changes
- integration tests
- tests passing

Security:
- scoped BI and DT access
- confidential-evidence handling
- payload redaction
- RLS status

Not started:
- DT → SIM consumer
- DT → ADI consumer
- twin calibration
- remaining consumers
- replay execution
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 7 — DT and BI → SIM intake
```
