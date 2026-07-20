# INFINICUS PHASE 18 — POST-PRODUCTION OPTIMIZATION EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

## Objective

Implement Phase 18 only:

```text
Post-production optimization
```

Optimize the running platform using verified production evidence without changing core architecture or weakening safety controls.

Focus on:

- operational efficiency;
- cost efficiency;
- workflow simplification;
- event-flow tuning;
- support reduction;
- reliability improvements;
- measurable user-value improvements.

Do not begin broad product expansion in this phase.

## 1. Preconditions

Confirm:

- Phase 17 rollout is complete or in stable production.
- Production SLOs, dashboards, incident records, cost reports, and usage data exist.
- No unresolved critical defects exist.
- Optimization work can be measured against an established baseline.
- Feature flags and rollback controls remain available.

## 2. Optimization baseline

Capture:

```text
API latency
event processing latency
end-to-end cycle duration
database query latency
database storage growth
relay lag
retry rate
dead-letter rate
consumer failure rate
simulation execution time
ADI decision latency
approval latency
outcome-monitoring delay
learning-cycle duration
infrastructure cost
AI provider cost
support ticket volume
workflow completion rate
user abandonment rate
```

Persist a versioned baseline report.

## 3. Optimization workstreams

### Database

- identify slow queries;
- inspect query plans;
- tune indexes;
- remove redundant indexes only with evidence;
- improve pagination;
- reduce over-fetching;
- tune connection pools;
- verify vacuum and analyze behavior;
- optimize retention and archival jobs.

### Event backbone

- tune relay batch sizes;
- tune polling interval;
- tune worker concurrency;
- tune retry schedules;
- reduce unnecessary event fan-out;
- improve subscription filtering;
- reduce duplicate serialization;
- verify aggregate ordering.

### API and services

- reduce redundant service calls;
- introduce bounded caching where safe;
- improve input validation efficiency;
- reduce payload sizes;
- eliminate N+1 access patterns;
- optimize serialization;
- tune timeouts.

### Simulation

- benchmark deterministic Monte Carlo runs;
- optimize batch execution;
- introduce bounded parallelism;
- reuse immutable input structures;
- optimize aggregate calculations;
- preserve Engine v3 parity.

### ADI and AI usage

- reduce unnecessary model calls;
- introduce deterministic pre-filters;
- cache safe reusable results;
- enforce token and cost budgets;
- use smaller models where quality tests permit;
- preserve decision-quality thresholds.

### Operations

- reduce alert noise;
- improve runbook precision;
- automate safe routine checks;
- improve incident triage;
- reduce mean time to recovery;
- improve support diagnostics.

## 4. Optimization governance

Every optimization must include:

```text
baseline
hypothesis
expected gain
risk
test
measurement window
rollback plan
actual result
decision
```

Do not merge optimizations based on intuition alone.

## 5. Performance budgets

Define budgets for:

```text
API p50, p95, p99
relay lag
consumer latency
database query latency
simulation execution
ADI decision request
approval workflow
full end-to-end cycle
memory
CPU
database connections
event payload size
AI token usage
cost per business cycle
```

Budgets must be explicit and monitored.

## 6. Cost optimization

Implement controls for:

```text
idle worker reduction
right-sized compute
database storage lifecycle
AI token budgets
simulation quotas
event retention
log retention
archive storage
tenant-level cost attribution
cost anomaly alerts
```

Do not reduce observability below operational safety requirements.

## 7. Tests

Create:

```text
benchmark tests
query-plan regression tests
event-throughput tests
load tests
cost-regression tests
cache correctness tests
simulation parity tests
AI quality regression tests
rollback tests
```

## 8. Required artifacts

Create:

```text
docs/post-production-optimization-plan.md
docs/performance-budget.md
docs/cost-optimization-plan.md
docs/optimization-governance.md
docs/optimization-results.md
artifacts/optimization-baseline.json
artifacts/optimization-benchmark-results.json
artifacts/optimization-cost-results.json
```

## 9. Stop condition

Stop after:

1. baseline is captured;
2. priority bottlenecks are ranked;
3. measured optimizations are implemented;
4. regression tests pass;
5. costs and latency improve or remain within approved budgets;
6. no safety control is weakened;
7. rollback paths are verified;
8. results are documented.

## 10. Completion report

Return:

```text
PHASE 18 REPORT

Baseline:
- exact metrics

Optimizations implemented:
- database
- event backbone
- API
- Simulation
- ADI
- operations

Results:
- before
- after
- percentage change
- cost impact
- reliability impact

Regressions:
- exact issue
- correction

Next recommended task:
- Phase 19 — performance hardening and resilience engineering
```
