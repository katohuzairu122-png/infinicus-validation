# INFINICUS EVENT BACKBONE — PHASE 14 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–13 implementations and completion reports
6. Database Stages 2A–2J implementation reports and frozen migration manifests
7. Simulation extraction specification and current compatibility status
8. Existing CI, audit, observability, RLS, relay, retry, dead-letter, and replay controls

## Objective

Implement Event Backbone Phase 14 only:

```text
Event Backbone closure audit
+
first complete end-to-end platform cycle
```

Prove that one business-scoped transaction can move safely through the complete platform:

```text
DA
→ BO
→ BI
→ DT
→ SIM
→ ADI
→ ABA
→ OM
→ CL
→ controlled feedback intake
```

This phase is verification and closure, not feature expansion.

Do not implement production activation, external adapters, frontend expansion, or autonomous deployment.

Stop after the complete cycle passes, defects are resolved or explicitly documented, and the backbone is formally closed.

---

# 1. PRECONDITIONS

Confirm:

- Phases 1–13 are implemented and pass independently.
- Stages 2A–2J exist and migrations are frozen.
- All required event contracts are registered.
- All required handoff contracts are registered.
- All vertical-slice consumers are registered.
- PostgreSQL 16 integration environment works.
- RLS, inbox, outbox, relay, retry, dead-letter, audit, and observability tests pass.
- Simulation has a testable execution path or a deterministic compatibility fixture capable of producing `sim.simulation.completed`.
- ADI has a deterministic test decision-generation path capable of producing `adi.decision.generated`.
- ABA has controlled test approval and execution fixtures.
- OM can finalize an outcome fixture.
- CL can validate, approve, publish, and route a feedback package.

If any prerequisite is absent, report it as a blocking gap. Do not fake the cycle.

---

# 2. CLOSURE AUDIT SCOPE

Audit these domains:

```text
contracts
registries
database
RLS
transactions
idempotency
ordering
correlation
causation
retries
dead letters
handoffs
acknowledgements
rejections
revocations
observability
audit history
CI
documentation
operational runbooks
```

Produce an auditable matrix with:

```text
requirement
implementation reference
test reference
status
evidence
gap
severity
owner
recommended correction
```

Statuses:

```text
passed
passed_with_limitation
failed
blocked
not_applicable
```

---

# 3. CANONICAL END-TO-END TEST SCENARIO

Create one deterministic business case.

Recommended scenario:

```text
small retail or service business
90-day horizon
known revenue and cost inputs
controlled operational records
known Digital Twin snapshot
fixed Simulation seed
known ADI recommendation
manual ABA approval fixture
controlled execution result
known OM outcome
known CL feedback candidate
```

Persist all fixture identifiers and expected checkpoints.

Do not use production data.

---

# 4. COMPLETE EVENT CHAIN

Verify this canonical chain, using existing equivalent names where already established:

```text
da.data.published
→ bo.business_profile.updated
→ bo.data.published
→ bi.analysis.requested
→ bi.analysis.completed
→ dt.state.updated
→ sim.simulation.requested
→ sim.simulation.completed
→ adi.decision.requested
→ adi.decision.generated
→ aba.approval.requested
→ aba.action.approved
→ aba.action.executed
→ om.monitoring.started
→ om.outcome.recorded
→ cl.learning.requested
→ cl.learning.published
→ <target>.learning_feedback.received
```

Do not introduce duplicate event names merely to satisfy this sequence.

---

# 5. TEST EXECUTION FLOW

Execute:

```text
seed tenant/workspace/business
→ seed DA source and publication package
→ enqueue da.data.published
→ run relay cycles
→ observe BO profile and publication
→ observe BI intake and completed analysis fixture
→ observe DT state update
→ create compatible Simulation request
→ observe Simulation input and completed result fixture
→ observe ADI intake and generated decision fixture
→ observe ABA candidate and approval request
→ record controlled human approval fixture
→ record controlled action execution fixture
→ observe OM monitoring and finalized outcome fixture
→ observe CL learning intake
→ run deterministic validation
→ record authorized learning approval fixture
→ publish approved learning
→ observe one target feedback intake
```

Use explicit waits with bounded timeout. Do not use unbounded polling.

---

# 6. CORRELATION AND CAUSATION

Verify:

- one root correlation ID remains traceable through the complete cycle;
- every event has a valid causation ID except the root event;
- no causation loop exists;
- handoff acknowledgements reference the correct package and event;
- retries preserve correlation and causation;
- dead-letter and replay metadata preserve the original chain;
- logs and audit records can reconstruct the full lineage.

Create a machine-readable lineage report.

---

# 7. IDEMPOTENCY

Replay or redeliver selected events at every major boundary:

```text
DA → BO
BO → BI
BI → DT
BI/DT → SIM
SIM → ADI
ADI → ABA
ABA → OM
OM → CL
CL → target
```

Verify:

- no duplicate domain effect;
- no duplicate handoff acknowledgement;
- no duplicate outbound event;
- no duplicate publication package;
- no duplicate approval or execution record;
- no duplicate learning publication;
- deterministic idempotent result returned.

---

# 8. FAILURE INJECTION

Inject controlled failures:

```text
transient consumer failure
permanent schema failure
unsupported event version
tenant mismatch
workspace mismatch
missing provenance
low quality/confidence
consumer timeout
stale claim
database rollback
dead-letter threshold
revoked handoff package
revoked learning publication
```

Verify:

- transient failure retries;
- permanent failure rejects or dead-letters;
- rollback removes partial writes;
- tenant/workspace leakage does not occur;
- retry limits work;
- dead-letter evidence is complete;
- unrelated events continue processing;
- health and readiness reflect degradation.

---

# 9. ORDERING AND CONCURRENCY

Verify:

- aggregate ordering is preserved where required;
- multiple workers do not double-process;
- unrelated businesses process concurrently;
- same aggregate does not violate state order;
- stale claims recover;
- shutdown is graceful;
- one slow consumer does not halt the platform;
- feedback intake cannot precede learning publication.

---

# 10. SECURITY AUDIT

Verify:

- every tenant-owned table has correct RLS;
- application role cannot bypass RLS;
- same-tenant cross-workspace access is blocked;
- privileged relay access is isolated;
- no raw secrets appear in events, logs, errors, or audit records;
- sensitive evidence is referenced, not unnecessarily copied;
- human approval identities are authorized;
- no automatic approval or deployment occurs;
- no direct CL mutation of upstream production state occurs.

---

# 11. DATABASE AUDIT

Verify:

- all migrations apply from empty PostgreSQL 16;
- rerun is idempotent;
- frozen migration checksums match;
- schema and table manifests match reality;
- required constraints and indexes exist;
- RLS policies are enabled and forced where required;
- status constraints reject invalid transitions;
- inbox uniqueness exists;
- delivery attempts are immutable;
- audit and provenance history are immutable;
- all repository integration tests pass.

---

# 12. CONTRACT AUDIT

Verify:

- every produced event has a registered contract;
- every consumed version is supported;
- every handoff has a registered contract;
- no duplicate type/version registration;
- deprecated versions remain readable;
- retired versions cannot publish;
- unknown versions fail closed;
- payload schemas reject invalid fields and values;
- public exports resolve without deep imports.

Produce:

```text
event-contract-coverage.json
handoff-contract-coverage.json
consumer-coverage.json
```

---

# 13. OBSERVABILITY AUDIT

Verify availability of:

```text
event and handoff logs
relay metrics
consumer metrics
retry metrics
dead-letter metrics
vertical-slice metrics
health status
readiness status
correlation lineage
audit history
```

Create one trace report for the full cycle containing:

```text
timestamp
event type
event ID
producer
consumer
aggregate
correlation ID
causation ID
attempt
status
duration
handoff/package reference
```

---

# 14. CI CLOSURE

Add or complete CI jobs for:

```text
workspace validation
lint
typecheck
unit tests
PostgreSQL migration test
migration idempotency
frozen migration checksum
RLS tests
repository integration tests
event and handoff contract tests
relay tests
all vertical-slice tests
complete-cycle test
build
secret scan
```

The complete-cycle test may run in a dedicated integration job.

CI must fail when required database tests are skipped.

---

# 15. DEFECT HANDLING

Classify discovered defects:

```text
critical
high
medium
low
documentation
```

Fix critical and high defects within this phase when the fix is local and does not violate frozen migration policy.

For unresolved defects, record:

```text
defect ID
severity
affected layer
affected event or handoff
reproduction
impact
temporary control
recommended fix
owner
blocking status
```

Do not claim closure with unresolved critical defects.

---

# 16. REQUIRED ARTIFACTS

Create:

```text
docs/event-backbone-closure-audit.md
docs/event-backbone-coverage-matrix.md
docs/end-to-end-platform-cycle.md
docs/event-lineage-report.md
docs/event-backbone-known-limitations.md
docs/event-backbone-operational-runbook.md
docs/event-backbone-incident-runbook.md
docs/event-backbone-release-readiness.md
artifacts/event-contract-coverage.json
artifacts/handoff-contract-coverage.json
artifacts/consumer-coverage.json
artifacts/end-to-end-lineage.json
artifacts/event-backbone-test-summary.json
```

Use existing documentation paths when conventions differ.

---

# 17. TEST TARGET

Target:

```text
all Phase 1–13 tests passing
complete-cycle test passing
at least 150 additional closure and cross-layer tests
zero unresolved critical defects
zero tenant/workspace isolation failures
zero duplicate domain effects under redelivery
```

Do not inflate test counts with meaningless duplication.

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

Run the complete-cycle integration command and PostgreSQL 16 CI-equivalent workflow locally where supported.

Do not use production credentials.

---

# 19. PROHIBITED WORK

Do not implement:

- production activation of CL proposals;
- automatic deployment;
- external brokers or adapters;
- frontend expansion;
- unrelated feature development;
- broad architecture rewrites;
- direct modification of frozen migrations without an approved defect process.

---

# 20. STOP CONDITION

Stop after:

1. Phase 1–13 coverage is audited;
2. complete end-to-end cycle passes;
3. correlation and causation lineage is proven;
4. idempotency passes across every boundary;
5. failure injection passes;
6. RLS and security audit pass;
7. contract and consumer coverage is complete;
8. CI includes the complete-cycle gate;
9. no unresolved critical defects remain;
10. closure artifacts and runbooks are complete;
11. formal completion report is produced.

Do not begin production activation workflows.

---

# 21. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 14 REPORT

Closure decision:
- CLOSED
- CLOSED WITH LIMITATIONS
- NOT CLOSED

Architecture coverage:
- events
- handoffs
- consumers
- target feedback paths

Complete cycle:
- DA
- BO
- BI
- DT
- SIM
- ADI
- ABA
- OM
- CL
- feedback target

Verification:
- correlation
- causation
- idempotency
- ordering
- concurrency
- retries
- dead letters
- rollback
- tenant isolation
- workspace isolation
- security
- audit
- observability
- CI

Defects:
- critical
- high
- medium
- low
- unresolved blockers

Artifacts:
- exact files

Validation:
- command
- result

Known limitations:
- exact limitation
- operational impact
- control

Next recommended task:
- Event Backbone Phase 15 — controlled activation and deployment governance
```
