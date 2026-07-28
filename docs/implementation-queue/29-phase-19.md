# INFINICUS PHASE 19 — PERFORMANCE HARDENING AND RESILIENCE EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

## Objective

Implement Phase 19 only:

```text
Performance hardening
+
resilience engineering
```

Prove that INFINICUS remains stable under sustained load, burst load, degraded dependencies, partial failures, and recovery events.

Do not begin product expansion in this phase.

## 1. Preconditions

Confirm:

- Phase 18 optimization report exists.
- Performance budgets exist.
- Production-like load environment exists.
- Failure injection is isolated from real production users.
- Rollback and kill switches work.
- Backup and restore procedures are current.

## 2. Load profiles

Test:

```text
steady expected load
2x expected load
5x burst load
long-running soak load
high event fan-out
large tenant
many small tenants
large Simulation jobs
high ADI request volume
approval queue spike
monitoring observation spike
learning-publication spike
```

## 3. Resilience scenarios

Inject:

```text
database latency
database connection exhaustion
relay worker crash
consumer timeout
consumer crash
network partition
AI provider timeout
AI provider rate limit
Simulation worker saturation
dead-letter surge
stale claims
partial deployment failure
cache failure
secret rotation
node restart
region or availability-zone degradation where supported
```

## 4. Hardening controls

Implement or verify:

```text
timeouts
bounded retries
circuit breakers
bulkheads
backpressure
queue limits
rate limits
tenant quotas
load shedding
graceful degradation
graceful shutdown
health checks
readiness checks
automatic stale-claim recovery
bounded concurrency
memory limits
connection-pool limits
```

## 5. Degraded-mode behavior

Define safe behavior when:

```text
Simulation unavailable
ADI unavailable
database partially degraded
event backlog high
external provider unavailable
approval service delayed
OM delayed
CL unavailable
```

The platform must fail safely and preserve evidence.

## 6. Data integrity under failure

Verify:

- no partial domain commit;
- no duplicate domain effect;
- no missing audit trail;
- no cross-tenant leakage;
- no broken correlation chain;
- no out-of-order invalid state;
- no lost approved action;
- no untracked rollback;
- no silent learning publication failure.

## 7. Disaster recovery

Test:

```text
backup restore
point-in-time recovery where supported
worker redeployment
contract-registry rebuild
consumer-registry rebuild
dead-letter recovery
configuration rollback
secret rotation recovery
```

Document RPO and RTO evidence.

## 8. Capacity model

Create a model for:

```text
maximum tenants
maximum businesses
events per second
concurrent Simulation runs
concurrent ADI requests
database connections
storage growth
worker count
cost per scale tier
```

## 9. Tests

Create:

```text
load tests
stress tests
soak tests
chaos tests
failover tests
recovery tests
capacity-limit tests
memory-leak tests
connection-exhaustion tests
data-integrity tests
```

Target at least 100 meaningful hardening tests.

## 10. Required artifacts

Create:

```text
docs/performance-hardening-plan.md
docs/resilience-strategy.md
docs/degraded-mode-behavior.md
docs/capacity-model.md
docs/disaster-recovery-evidence.md
docs/performance-hardening-results.md
artifacts/load-test-results.json
artifacts/chaos-test-results.json
artifacts/capacity-model.json
artifacts/recovery-test-results.json
```

## 11. Stop condition

Stop after:

1. all load profiles run;
2. all critical failure scenarios are tested;
3. data integrity remains intact;
4. SLOs remain within approved tolerance or limitations are documented;
5. capacity limits are known;
6. RPO and RTO are verified;
7. degraded modes are documented;
8. no unresolved critical resilience defect remains.

## 12. Completion report

Return:

```text
PHASE 19 REPORT

Load results:
- steady
- burst
- soak
- high fan-out
- large tenant
- many tenants

Failure results:
- database
- relay
- consumer
- AI provider
- Simulation
- cache
- deployment
- secret rotation

Capacity:
- tenants
- businesses
- events/sec
- concurrent runs
- storage growth
- cost tiers

Recovery:
- RPO
- RTO
- restore result
- failover result

Next recommended task:
- Phase 20 — governed product expansion
```
