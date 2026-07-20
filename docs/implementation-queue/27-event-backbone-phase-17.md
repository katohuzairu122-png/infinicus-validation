# INFINICUS EVENT BACKBONE — PHASE 17 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

## Objective

Implement Phase 17 only:

```text
Phased production rollout
+
operational stabilization
```

Move from a successful pilot to controlled production availability using progressive exposure, strict observability, rollback, and operational ownership.

Do not perform an unrestricted all-at-once launch.

## 1. Preconditions

Confirm:

- Phase 16 decision permits rollout.
- Pilot success criteria passed.
- No unresolved critical defects exist.
- Rollback and backup/restore drills passed.
- On-call ownership exists.
- Production secrets and access controls are ready.
- Capacity and cost budgets are approved.
- Legal, privacy, and data-retention requirements are approved where applicable.

## 2. Rollout stages

Use:

```text
Stage 0 — internal operators only
Stage 1 — 1–5 pilot businesses
Stage 2 — 10–25 businesses
Stage 3 — 10% eligible traffic
Stage 4 — 25% eligible traffic
Stage 5 — 50% eligible traffic
Stage 6 — 100% approved scope
```

Promotion requires an explicit gate decision.

## 3. Promotion gates

At every stage verify:

```text
error rate
event lag
retry rate
dead-letter rate
database health
RLS failures
API latency
worker health
end-to-end cycle completion
approval latency
rollback readiness
support incidents
resource use
cost
customer-impact indicators
```

Do not promote when any critical threshold is breached.

## 4. Production controls

Implement or verify:

```text
environment-specific configuration
feature flags
progressive rollout controls
tenant allowlists
rate limits
quotas
circuit breakers
kill switches
deployment approvals
change windows
maintenance mode
secret rotation
backup schedule
restore verification
```

## 5. Operational ownership

Define:

```text
service owner
database owner
event-backbone owner
security owner
on-call rotation
incident commander
release manager
approval owner
rollback authority
support escalation
```

## 6. Runbooks

Create or finalize:

```text
deployment
rollback
event backlog
dead-letter surge
consumer failure
database degradation
RLS incident
secret compromise
cross-tenant incident
simulation failure
ADI failure
approval workflow failure
outcome-monitoring failure
learning-publication failure
activation-governance failure
```

## 7. SLOs and SLIs

Define:

```text
API availability
relay availability
event processing latency
end-to-end decision-cycle latency
dead-letter threshold
database availability
RPO
RTO
backup success rate
consumer success rate
approval workflow availability
```

Example initial targets must be explicitly approved, not silently assumed.

## 8. Production observability

Provide:

```text
executive dashboard
operations dashboard
security dashboard
database dashboard
eventing dashboard
vertical-slice dashboard
cost dashboard
customer-impact dashboard
```

Alerts must be actionable and mapped to runbooks.

## 9. Incident management

Support:

```text
severity classification
incident declaration
containment
tenant isolation
feature disablement
rollback
evidence preservation
customer communication workflow
post-incident review
corrective action tracking
```

A cross-tenant data incident is always critical.

## 10. Change management

Require:

```text
change request
risk classification
test evidence
approval
deployment window
rollback plan
verification plan
post-deployment review
```

High-risk changes require enhanced approval and canary rollout.

## 11. Data operations

Verify:

```text
retention jobs
archival
deletion
legal hold where applicable
backup
restore
migration monitoring
index health
query performance
storage growth
audit retention
```

## 12. Cost controls

Implement:

```text
database budget alerts
compute budget alerts
event volume alerts
storage growth alerts
AI provider limits
simulation execution quotas
tenant quotas
cost attribution
emergency throttling
```

## 13. Production validation

At each stage run:

```text
smoke tests
selected end-to-end cycle
RLS tests
event idempotency checks
rollback readiness check
health/readiness checks
contract registry check
consumer registry check
backup verification
```

## 14. Stabilization window

After each promotion stage:

```text
hold exposure
observe metrics
review incidents
review dead letters
review costs
review customer impact
resolve defects
approve next stage
```

No automatic promotion.

## 15. Post-launch hardening

Complete:

```text
performance tuning
index tuning
worker concurrency tuning
retry-policy tuning
alert tuning
capacity adjustment
documentation correction
support training
security review
disaster-recovery rehearsal
```

## 16. Tests

Create or run:

```text
production smoke suite
progressive rollout tests
tenant allowlist tests
kill-switch tests
circuit-breaker tests
quota tests
incident drills
rollback drills
disaster-recovery drill
cost-limit tests
SLO reporting tests
```

Target at least 100 meaningful rollout and operations tests.

## 17. Required artifacts

Create:

```text
docs/production-rollout-plan.md
docs/production-promotion-gates.md
docs/production-slos.md
docs/production-ownership.md
docs/production-alerts.md
docs/production-incident-management.md
docs/production-change-management.md
docs/production-cost-controls.md
docs/production-stabilization-report.md
docs/production-launch-decision.md
artifacts/production-stage-results.json
artifacts/production-slo-report.json
artifacts/production-incident-summary.json
artifacts/production-cost-report.json
```

## 18. Prohibited work

Do not:

- launch all tenants at once;
- disable RLS;
- bypass approval gates;
- use unbounded AI or Simulation execution;
- permit automatic promotion;
- delete audit evidence;
- suppress critical alerts;
- activate unvalidated CL proposals;
- perform unrelated feature expansion.

## 19. Stop condition

Stop after:

1. rollout stages are defined;
2. production controls exist;
3. ownership and on-call are defined;
4. SLOs and alerts exist;
5. staged deployment proceeds only through approved gates;
6. rollback and incident drills pass;
7. cost controls pass;
8. stabilization window completes;
9. production launch decision is documented;
10. unresolved critical defects are zero.

## 20. Completion report

Return:

```text
EVENT BACKBONE PHASE 17 REPORT

Rollout status:
- NOT STARTED
- IN PROGRESS
- STABILIZING
- COMPLETE
- ROLLED BACK

Stages:
- Stage 0
- Stage 1
- Stage 2
- Stage 3
- Stage 4
- Stage 5
- Stage 6

For each stage:
- scope
- duration
- metrics
- incidents
- defects
- costs
- promotion decision

Operations:
- SLO status
- alert status
- on-call readiness
- backup/restore
- rollback
- security
- cost controls

Launch decision:
- production approved
- limited production only
- continue stabilization
- rollback and remediate

Next recommended task:
- post-production optimization and product expansion
```
