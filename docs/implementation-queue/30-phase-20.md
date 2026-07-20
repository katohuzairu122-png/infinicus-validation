# INFINICUS PHASE 20 — GOVERNED PRODUCT EXPANSION EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

## Objective

Implement Phase 20 only:

```text
Governed product expansion
```

Expand INFINICUS through modular, evidence-backed product capabilities without destabilizing the production core.

Do not perform uncontrolled feature accumulation.

## 1. Preconditions

Confirm:

- Phase 19 hardening passes.
- Core SLOs are stable.
- Capacity headroom exists.
- Cost budgets are approved.
- Product analytics exist.
- Expansion proposals have measurable user and business value.
- Feature flags and rollback remain available.

## 2. Expansion governance

Every proposed capability must include:

```text
problem
target user
business value
evidence
scope
architecture impact
data impact
security impact
cost
success metrics
MVP boundary
rollback
deprecation plan
```

Rank proposals by:

```text
value
strategic fit
revenue potential
implementation effort
risk
platform reuse
time to validation
```

## 3. Expansion domains

Evaluate and prioritize:

### Business onboarding

- guided business setup;
- industry templates;
- data-import assistants;
- setup validation;
- readiness scoring.

### Decision workspaces

- decision history;
- scenario comparison;
- evidence explorer;
- approval workspace;
- decision explanations;
- audit views.

### Simulation products

- industry scenario packs;
- custom assumption sets;
- multi-scenario comparison;
- portfolio simulation;
- sensitivity explorer;
- stress-test library.

### Intelligence products

- metric dashboards;
- forecast workspaces;
- anomaly review;
- Digital Twin explorer;
- risk intelligence;
- benchmark intelligence.

### Action products

- approval center;
- action planning;
- execution tracking;
- evidence management;
- reversal and cancellation workflows.

### Outcome and learning products

- outcome dashboards;
- expected-versus-actual views;
- attribution review;
- learning candidate review;
- feedback governance;
- calibration proposals.

### Platform products

- multi-tenant administration;
- roles and permissions;
- billing and usage;
- API access;
- webhooks;
- integration marketplace;
- audit exports;
- developer portal.

## 4. Expansion architecture

Each new product must use:

```text
existing canonical entities
existing event contracts
existing handoff boundaries
existing tenant isolation
existing audit
existing approval controls
existing feature flags
existing observability
```

Do not create parallel architectures.

## 5. MVP rule

For each selected product:

```text
one user problem
one primary workflow
one measurable outcome
one bounded release
```

Avoid launching multiple large product tracks simultaneously.

## 6. Suggested first expansion sequence

Recommended:

```text
1. Decision History and Evidence Workspace
2. Simulation Scenario Comparison
3. Approval Center
4. Outcome Dashboard
5. Guided Business Onboarding
6. API and Integration Access
7. Billing and Usage Management
8. Industry Templates
```

Final order must be based on product evidence.

## 7. Product analytics

Instrument:

```text
activation
workflow completion
time to first value
repeat usage
decision completion
approval completion
Simulation completion
outcome review
retention
conversion
feature abandonment
support demand
cost per active business
```

## 8. Monetization readiness

Prepare:

```text
plan limits
usage metering
tenant quotas
Simulation credits
AI decision credits
data-retention tiers
team-seat limits
API limits
billing events
invoice evidence
entitlement enforcement
```

Do not enable billing without financial and legal review.

## 9. Security and compliance

Every expansion must review:

```text
data classification
permissions
tenant isolation
audit
retention
export
deletion
legal requirements
payment scope where applicable
integration secrets
webhook signing
API abuse controls
```

## 10. Delivery model

Use:

```text
proposal
→ product specification
→ architecture review
→ threat model
→ implementation
→ contract tests
→ integration tests
→ pilot
→ staged rollout
→ measurement
→ continue, revise, or retire
```

## 11. Required artifacts

Create:

```text
docs/product-expansion-strategy.md
docs/product-prioritization-matrix.md
docs/expansion-architecture-rules.md
docs/product-analytics-plan.md
docs/monetization-readiness.md
docs/first-expansion-mvp.md
docs/product-expansion-roadmap.md
artifacts/product-prioritization.json
artifacts/expansion-metrics-baseline.json
```

## 12. Stop condition

Stop after:

1. expansion opportunities are evaluated;
2. one first MVP is selected;
3. scope and architecture are approved;
4. analytics and success metrics are defined;
5. security and cost reviews pass;
6. implementation plan is prepared;
7. no parallel architecture is introduced;
8. staged pilot and rollout plan exists.

## 13. Completion report

Return:

```text
PHASE 20 REPORT

Opportunities evaluated:
- exact products

Prioritization:
- value
- effort
- risk
- revenue potential
- strategic fit

Selected first MVP:
- problem
- user
- scope
- architecture
- success metrics
- cost
- risks
- rollout

Deferred products:
- reason
- revisit condition

Next recommended task:
- execute the selected expansion MVP
```
