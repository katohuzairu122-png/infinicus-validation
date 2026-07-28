# INFINICUS EVENT BACKBONE — PHASE 15 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. Event Backbone Phase 14 closure report
3. Continuous Learning Phase 12 and Phase 13 implementation reports
4. All target-layer feedback intake contracts and proposal schemas
5. Existing approval, authorization, audit, release, rollback, RLS, and CI patterns
6. Existing production deployment conventions, if any

## Objective

Implement Event Backbone Phase 15 only:

```text
Controlled activation and deployment governance
```

Create the governed boundary that can move a reviewed target-layer proposal from:

```text
accepted_for_review
→ validated
→ approved
→ scheduled
→ activated in a controlled environment
→ verified
→ promoted or rolled back
```

This phase must preserve human authorization, separation of duties, versioning, rollback, audit, and target-layer ownership.

Do not build a generic autonomous self-modifying system.

Do not allow Continuous Learning to directly alter production.

Stop after governed activation workflows, canary/sandbox verification, rollback, and audit are live-tested.

---

# 1. PRECONDITIONS

Confirm:

- Phase 14 closure decision is `CLOSED` or `CLOSED WITH LIMITATIONS` without critical blockers.
- Phase 13 target feedback intakes exist.
- Target-layer proposal persistence exists.
- Target layers own their activation records.
- Approval and authorization infrastructure exists.
- Audit and provenance are immutable.
- Rollback metadata is present in every deployable proposal.
- CI and complete-cycle tests pass.
- Production environment access is not required for integration tests.

If these prerequisites are absent, stop and report the blockers.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
apps/api/src/governance/activation/
├── shared/
│   ├── ActivationPolicyResolver.ts
│   ├── ActivationApprovalService.ts
│   ├── ActivationScheduler.ts
│   ├── ActivationVerifier.ts
│   ├── RollbackCoordinator.ts
│   ├── SeparationOfDutiesPolicy.ts
│   ├── ActivationErrors.ts
│   └── index.ts
├── targets/
│   ├── DaActivationAdapter.ts
│   ├── BoActivationAdapter.ts
│   ├── BiActivationAdapter.ts
│   ├── DtActivationAdapter.ts
│   ├── SimActivationAdapter.ts
│   ├── AdiActivationAdapter.ts
│   ├── AbaActivationAdapter.ts
│   ├── OmActivationAdapter.ts
│   └── index.ts
├── ActivationOrchestrator.ts
├── ActivationEventDefinitions.ts
└── index.ts
```

Tests:

```text
apps/api/tests/governance/activation/
├── activation-policy.unit.test.ts
├── separation-of-duties.unit.test.ts
├── activation-state-machine.unit.test.ts
├── target-adapters.integration.test.ts
├── canary-verification.integration.test.ts
├── rollback.integration.test.ts
├── activation-idempotency.integration.test.ts
├── activation-rls.integration.test.ts
└── activation-failure.integration.test.ts
```

---

# 3. ACTIVATION STATES

Use:

```text
draft
awaiting_validation
validated
validation_failed
pending_approval
approved
scheduled
activating
active_canary
active
verification_failed
rolling_back
rolled_back
cancelled
expired
revoked
```

Allowed flow:

```text
draft → awaiting_validation
awaiting_validation → validated
awaiting_validation → validation_failed
validated → pending_approval
pending_approval → approved
pending_approval → cancelled
approved → scheduled
scheduled → activating
activating → active_canary
active_canary → active
active_canary → verification_failed
verification_failed → rolling_back
active → rolling_back
rolling_back → rolled_back
approved → revoked
scheduled → cancelled
```

Reject all undocumented transitions.

---

# 4. GOVERNANCE PRINCIPLES

Enforce:

```text
target-layer ownership
human approval
separation of duties
least privilege
versioned configuration
immutable audit
bounded scope
canary or sandbox first
measurable verification
automatic rollback only within pre-authorized boundaries
no hidden mutation
```

Continuous Learning may propose and publish.

The target layer must validate and own activation.

---

# 5. SEPARATION OF DUTIES

Minimum distinct roles:

```text
proposer
validator
approver
operator
verifier
```

Policy may permit role combinations for low-risk changes, but:

- proposer cannot be sole approver for high-risk changes;
- operator cannot be sole verifier;
- dual approval requires distinct actors;
- security/legal-required approvals cannot be substituted;
- system identities cannot perform human approval.

Persist actor identity, role, authorization scope, timestamp, and decision.

---

# 6. ACTIVATION POLICY

Resolve policy using:

```text
target layer
candidate type
risk level
business scope
tenant scope
financial impact
customer impact
legal impact
security impact
model or policy criticality
rollback capability
```

Activation classes:

```text
sandbox_only
canary_required
limited_scope
scheduled_standard
enhanced_review
prohibited
```

A prohibited proposal cannot activate.

A missing policy fails closed.

---

# 7. TARGET ADAPTER BOUNDARIES

Each adapter must create a versioned target-owned configuration or rule candidate.

## DA

May activate only reviewed:

```text
data-quality rule versions
source validation rules
normalization rule versions
```

## BO

May activate only reviewed:

```text
operational threshold versions
workflow policy versions
business rule versions
```

## BI

May activate only reviewed:

```text
forecast calibration versions
metric threshold versions
analytical model configuration versions
```

## DT

May activate only reviewed:

```text
calibration versions
assumption versions
divergence threshold versions
```

## SIM

May activate only reviewed:

```text
distribution versions
assumption-set versions
model configuration versions
```

Engine v3 behavior remains protected unless a versioned compatibility test passes.

## ADI

May activate only reviewed:

```text
decision rule versions
scoring configuration versions
ranking configuration versions
prompt-template versions where applicable
```

Never activate raw unreviewed prompts.

## ABA

May activate only reviewed:

```text
approval policy versions
route versions
authorization threshold versions
```

Require enhanced approval.

## OM

May activate only reviewed:

```text
monitoring threshold versions
alert rule versions
attribution configuration versions
```

No adapter may mutate unrelated target state.

---

# 8. VERSIONING

Every activation must reference:

```text
proposal ID
feedback package ID
learning candidate ID
target component
previous version
new version
configuration checksum
effective time
scope
rollback version
validation evidence
approval evidence
```

Activated versions are immutable.

A correction creates a new version.

---

# 9. SANDBOX AND CANARY

Before full activation:

```text
apply in sandbox or isolated test scope
→ run target validation
→ run regression tests
→ compare expected metrics
→ activate limited canary scope
→ observe verification window
→ promote or roll back
```

Canary scope may be:

```text
single tenant
single workspace
single business
small percentage
shadow mode
non-authoritative evaluation
```

Default to the narrowest safe scope.

---

# 10. VERIFICATION

Define target-specific success and failure criteria before activation.

Persist:

```text
verification metric
baseline
expected range
observation window
failure threshold
rollback trigger
actual result
decision
```

No activation may begin without measurable criteria unless policy explicitly allows a documentation-only change.

---

# 11. ROLLBACK

Every deployable proposal must have:

```text
rollback version
rollback procedure
rollback authorization
rollback trigger
maximum rollback time
data compatibility note
```

Support:

```text
manual rollback
pre-authorized automatic rollback
```

Automatic rollback is allowed only when:

- trigger is predefined;
- scope is bounded;
- rollback version is verified;
- policy permits it;
- audit is recorded.

Do not allow automatic activation merely because automatic rollback exists.

---

# 12. ACTIVATION ORCHESTRATOR

Implement:

```ts
interface ActivationOrchestrator {
  validateProposal(...): Promise<ActivationValidationResult>;
  requestApproval(...): Promise<ActivationApprovalRequest>;
  schedule(...): Promise<ActivationSchedule>;
  activateCanary(...): Promise<ActivationResult>;
  verify(...): Promise<ActivationVerificationResult>;
  promote(...): Promise<ActivationResult>;
  rollback(...): Promise<RollbackResult>;
  revoke(...): Promise<ActivationRevocationResult>;
}
```

All state transitions must be transactional and auditable.

---

# 13. EVENTS

Use existing canonical equivalents or add registered contracts for:

```text
governance.activation.requested
governance.activation.validated
governance.activation.approved
governance.activation.scheduled
governance.activation.canary_started
governance.activation.promoted
governance.activation.verification_failed
governance.activation.rollback_started
governance.activation.rolled_back
governance.activation.revoked
```

Do not emit `active` before verification and promotion succeed.

---

# 14. IDEMPOTENCY

Protect using:

```text
proposal ID and version
activation request ID
target layer
target component
new version
schedule ID
canary ID
rollback ID
```

Duplicate commands must not duplicate configuration versions, approvals, schedules, canaries, promotions, or rollbacks.

---

# 15. SECURITY

Enforce:

- tenant/workspace/business scope;
- least-privilege operator permissions;
- separation of duties;
- authorized environment;
- no production credentials in event payloads;
- secret references through approved secret management only;
- high-risk target review;
- ABA enhanced approval;
- immutable activation and rollback audit;
- fail-closed behavior;
- no CL direct write access to target production tables.

---

# 16. TESTS

## Unit tests

- state transitions;
- policy resolution;
- prohibited activation;
- separation of duties;
- dual approval;
- invalid version;
- missing rollback;
- invalid canary scope;
- verification criteria;
- automatic rollback boundary;
- idempotency.

## Integration tests

For each target layer:

- create reviewed proposal;
- validate proposal;
- request and record approvals;
- schedule;
- activate sandbox/canary version;
- verify success and promote;
- inject verification failure and roll back;
- preserve previous version;
- block unauthorized actor;
- block cross-tenant/workspace access;
- duplicate commands are idempotent;
- audit chain complete.

## Full governed-cycle test

```text
published CL feedback
→ target intake
→ target proposal
→ target validation
→ human approval
→ scheduled canary
→ target-owned version created
→ verification succeeds
→ promotion
→ audit and lineage verified
```

Also execute failure path:

```text
canary activation
→ verification fails
→ rollback triggered
→ previous version restored
→ rollback event and audit recorded
```

Target:

```text
at least 120 meaningful tests
```

---

# 17. OBSERVABILITY

Logs:

```text
activation_validation_started
activation_validation_completed
activation_approval_requested
activation_approval_recorded
activation_scheduled
activation_canary_started
activation_verification_completed
activation_promoted
activation_verification_failed
activation_rollback_started
activation_rolled_back
activation_revoked
activation_failed
```

Metrics:

```text
activation_requested_total
activation_approved_total
activation_rejected_total
activation_canary_total
activation_promoted_total
activation_verification_failure_total
activation_rollback_total
activation_duration_seconds
```

Avoid high-cardinality metric labels.

---

# 18. DOCUMENTATION

Create:

```text
docs/governance/activation-governance.md
docs/governance/separation-of-duties.md
docs/governance/activation-policy.md
docs/governance/canary-strategy.md
docs/governance/activation-verification.md
docs/governance/rollback.md
docs/governance/target-adapters.md
docs/governance/activation-security.md
docs/governance/activation-runbook.md
docs/governance/emergency-rollback-runbook.md
```

---

# 19. VALIDATION COMMANDS

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

Run all activation integration tests against non-production PostgreSQL 16 and isolated target fixtures.

Do not use production credentials.

---

# 20. PROHIBITED WORK

Do not implement:

- unconstrained self-modification;
- automatic approval;
- direct CL production writes;
- unversioned configuration mutation;
- activation without rollback;
- full production rollout during tests;
- external deployment credentials in code;
- frontend expansion;
- unrelated features.

---

# 21. STOP CONDITION

Stop after:

1. shared activation governance exists;
2. all eight target adapters exist;
3. state machine and policy work;
4. separation of duties works;
5. versioning works;
6. sandbox/canary activation works;
7. measurable verification works;
8. promotion works;
9. rollback and revocation work;
10. idempotency works;
11. RLS and audit pass;
12. success and failure governed-cycle tests pass;
13. documentation and runbooks are complete;
14. completion report is produced.

Do not begin real production rollout.

---

# 22. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 15 REPORT

Created:
- activation governance
- policy resolver
- approval service
- scheduler
- verifier
- rollback coordinator
- separation-of-duties policy
- DA adapter
- BO adapter
- BI adapter
- DT adapter
- SIM adapter
- ADI adapter
- ABA adapter
- OM adapter
- events
- tests
- documentation

Validation:
- command
- result

Target verification:
- DA
- BO
- BI
- DT
- SIM
- ADI
- ABA
- OM

For each target:
- proposal validated
- approval enforced
- canary activated
- verification completed
- promotion or rollback
- version preserved
- audit complete
- idempotency
- tenant isolation
- workspace isolation

Safety:
- no automatic approval
- no CL direct production mutation
- separation of duties
- rollback readiness
- secret handling
- RLS status

Known limitations:
- exact limitation
- impact
- control

Next recommended task:
- production readiness review and controlled pilot deployment
```
