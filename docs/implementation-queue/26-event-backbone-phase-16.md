# INFINICUS EVENT BACKBONE — PHASE 16 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

## Objective

Implement Phase 16 only:

```text
Production readiness review
+
controlled pilot deployment
```

The pilot must validate the complete governed platform in a limited, reversible environment before general production rollout.

Do not perform unrestricted production deployment.

## 1. Preconditions

Confirm:

- Phase 14 closure decision is `CLOSED` or `CLOSED WITH LIMITATIONS` without critical blockers.
- Phase 15 activation governance passes.
- CI, RLS, audit, rollback, observability, backup, and incident controls pass.
- A non-production or isolated pilot environment exists.
- Pilot tenant/workspace/business scope is explicitly defined.
- No production secrets are embedded in code or events.

If any prerequisite is missing, stop and report the blocker.

## 2. Pilot scope

Define:

```text
pilot tenant
pilot workspace
pilot business
enabled layers
enabled event paths
data classification
maximum record volume
maximum execution volume
pilot duration
success criteria
failure criteria
rollback criteria
approvers
operators
observers
```

Default:

```text
single tenant
single workspace
single business
limited data
shadow or non-authoritative mode where possible
```

## 3. Readiness review

Audit:

```text
architecture
database
migrations
RLS
contracts
handoffs
relay
retry
dead letters
idempotency
observability
security
backup
restore
incident response
rollback
approvals
separation of duties
capacity
cost controls
data retention
privacy
documentation
```

Return statuses:

```text
ready
ready_with_controls
not_ready
```

## 4. Environment controls

Create or verify:

```text
pilot environment configuration
separate database or isolated schema strategy
separate credentials
least-privilege roles
feature flags
rate limits
quotas
kill switch
audit retention
backup schedule
restore test
secret rotation
network restrictions
```

## 5. Pilot deployment sequence

```text
prepare environment
→ apply migrations
→ verify schema and RLS
→ deploy API and workers
→ register contracts and consumers
→ enable selected feature flags
→ seed pilot tenant/workspace/business
→ run smoke tests
→ run controlled end-to-end cycle
→ observe pilot window
→ evaluate success criteria
→ continue, pause, or roll back
```

## 6. Feature flags

Use explicit flags for:

```text
event relay
vertical-slice consumers
simulation execution
ADI generation
ABA approval flow
OM monitoring
CL validation
CL publication
target feedback intake
activation governance
```

Default disabled outside pilot scope.

## 7. Pilot observability

Create dashboards or equivalent reports for:

```text
event throughput
relay lag
oldest pending event
consumer success/failure
retry count
dead letters
database latency
RLS failures
API errors
worker health
resource use
cost indicators
approval latency
end-to-end cycle duration
rollback readiness
```

## 8. Data and privacy controls

Verify:

- only approved pilot data is used;
- no unnecessary sensitive data is copied;
- retention rules are applied;
- deletion and revocation paths work;
- logs redact sensitive payloads;
- backups follow the same classification;
- pilot data can be isolated and removed.

## 9. Capacity and reliability tests

Run:

```text
baseline load
expected pilot load
2x expected load
burst load
worker restart
database restart
network timeout simulation
consumer timeout
stale claim recovery
dead-letter path
backup restore
rollback drill
```

Do not run destructive tests against production.

## 10. Security review

Verify:

```text
least privilege
secret handling
RLS
workspace isolation
admin access
relay privilege separation
audit immutability
approval authorization
deployment authorization
no direct CL production writes
no automatic approval
no uncontrolled external calls
```

## 11. Pilot success criteria

Minimum:

```text
zero tenant/workspace data leakage
zero duplicate domain effects
zero unresolved critical errors
all selected event paths pass
end-to-end lineage complete
rollback drill passes
backup restore passes
observability complete
pilot users can complete intended workflow
resource and cost limits remain within threshold
```

## 12. Pilot rollback

Support:

```text
disable feature flags
stop relay workers
stop target consumers
revert active canary versions
restore prior configuration
preserve audit and evidence
restore database only when required
document rollback reason
```

Do not delete evidence needed for audit.

## 13. Tests

Create:

```text
pilot smoke tests
pilot end-to-end tests
pilot load tests
pilot failure-injection tests
pilot rollback tests
pilot backup/restore tests
pilot security tests
pilot acceptance tests
```

Target at least 100 meaningful pilot-readiness tests.

## 14. Required artifacts

Create:

```text
docs/production-readiness-review.md
docs/pilot-scope.md
docs/pilot-deployment-plan.md
docs/pilot-security-review.md
docs/pilot-observability-plan.md
docs/pilot-rollback-plan.md
docs/pilot-acceptance-criteria.md
docs/pilot-results-report.md
docs/pilot-go-no-go-decision.md
artifacts/pilot-readiness-matrix.json
artifacts/pilot-test-summary.json
artifacts/pilot-lineage-report.json
```

## 15. Validation

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

Run pilot environment checks and the controlled end-to-end cycle.

## 16. Stop condition

Stop after:

1. readiness review is complete;
2. pilot scope is approved;
3. isolated pilot environment is verified;
4. deployment and smoke tests pass;
5. controlled end-to-end cycle passes;
6. load and failure tests pass;
7. rollback and restore drills pass;
8. pilot observation completes;
9. a formal go/no-go decision is produced.

Do not begin general production rollout.

## 17. Completion report

Return:

```text
EVENT BACKBONE PHASE 16 REPORT

Readiness decision:
- READY
- READY WITH CONTROLS
- NOT READY

Pilot scope:
- tenant
- workspace
- business
- duration
- enabled capabilities

Verification:
- deployment
- migrations
- RLS
- contracts
- consumers
- end-to-end cycle
- load
- failures
- backup/restore
- rollback
- observability
- security
- cost controls

Pilot results:
- success criteria met
- failures
- defects
- limitations

Decision:
- proceed to phased production rollout
- extend pilot
- roll back and remediate

Next recommended task:
- Phase 17 — phased production rollout and operational stabilization
```
