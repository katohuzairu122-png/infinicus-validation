# INFINICUS DATABASE STAGE 2G — AI DECISION INTELLIGENCE IMPLEMENTATION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

This prompt is implementation-ready. Do not redesign. Inspect, align, implement, validate, freeze, and report.

Read Stages 2A–2F completion reports, frozen migration manifest, ADI blocks ADI-01 through ADI-25, Platform Event Catalogue, Layer Handoff Contracts, and existing database conventions.

## Objective

Implement Database Stage 2G only:

```text
AI Decision Intelligence persistence
```

Canonical schema:

```text
ai_decision_intelligence
```

Use the next actual migration number after Stage 2F.

## Required table groups

### Decision intake

```text
decision_requests
decision_request_versions
decision_request_status_history
decision_input_packages
decision_input_package_versions
decision_input_items
decision_input_lineage
```

Sources include Simulation result packages, BI findings, DT snapshots, and approved user context.

### Evidence

```text
decision_evidence_packages
decision_evidence_package_versions
decision_evidence_items
decision_evidence_relationships
decision_evidence_quality
decision_evidence_limitations
decision_provenance_records
```

### Candidate generation

```text
decision_candidates
decision_candidate_versions
decision_candidate_actions
decision_candidate_assumptions
decision_candidate_constraints
decision_candidate_risks
decision_candidate_benefits
decision_candidate_costs
```

### Scoring and ranking

```text
decision_scoring_models
decision_scoring_model_versions
decision_scoring_runs
decision_score_components
decision_scores
decision_ranking_runs
decision_rankings
```

### Explanations and alternatives

```text
decision_explanations
decision_explanation_versions
decision_alternatives
decision_tradeoffs
decision_counterfactuals
decision_limitations
```

### Confidence and safety

```text
decision_confidence_records
decision_uncertainty_records
decision_safety_checks
decision_policy_checks
decision_validation_records
decision_human_review_requirements
```

### Recommendation package

```text
decision_recommendations
decision_recommendation_versions
decision_recommendation_evidence
decision_recommendation_alternatives
decision_recommendation_limitations
```

### Model/provider execution evidence

```text
decision_model_registry
decision_model_versions
decision_prompt_template_versions
decision_generation_runs
decision_generation_attempts
decision_provider_usage
decision_token_usage
decision_cost_records
```

Do not store secrets or raw credentials.

### Publication and handoff

```text
decision_publication_packages
decision_publication_package_versions
decision_publication_items
decision_handoff_receipts
decision_handoff_acknowledgements
decision_handoff_rejections
```

Target:

```text
approved_business_action
```

### Registry, deployment, rollback

```text
decision_component_registry
decision_component_versions
decision_deployments
decision_deployment_status_history
decision_rollbacks
```

## Lifecycle states

Decision request:

```text
draft
requested
validating
ready
generating
completed
failed
cancelled
expired
revoked
```

Recommendation:

```text
draft
validating
ready
published
superseded
rejected
revoked
```

Candidate:

```text
generated
scored
ranked
selected
rejected
superseded
```

Reject invalid transitions.

## Core rules

- Generated recommendations are not approvals.
- Every recommendation must have evidence, confidence, limitations, alternatives, and provenance.
- Scoring and ranking models are versioned.
- Prompt templates are versioned and immutable after activation.
- Model/provider execution records must be auditable.
- Token and cost usage must be attributable.
- No recommendation may bypass safety or policy checks.
- High-risk decisions must carry explicit human-review requirements.

## Suggested migration grouping

```text
<next>_ai_decision_intelligence_schema.sql
<next+1>_adi_requests_inputs.sql
<next+2>_adi_evidence.sql
<next+3>_adi_candidates.sql
<next+4>_adi_scoring_ranking.sql
<next+5>_adi_explanations_alternatives.sql
<next+6>_adi_confidence_safety_validation.sql
<next+7>_adi_recommendations.sql
<next+8>_adi_models_prompts_generation_usage.sql
<next+9>_adi_publication_handoffs.sql
<next+10>_adi_registry_deployment.sql
<next+11>_adi_indexes.sql
<next+12>_adi_rls.sql
<next+13>_adi_triggers.sql
<next+14>_adi_event_functions.sql
```

## Constraints

Enforce valid states, positive versions, score/confidence ranges, unique request idempotency keys, unique candidate and recommendation versions, valid risk classification, valid review requirement, valid target layer, and non-negative token/cost values.

Use `NUMERIC` for scores and financial cost.

## RLS

Enable RLS on every tenant-owned table. Enforce tenant, workspace, and business scope. Missing context fails closed.

## Immutability

Immutable after completion/publication:

```text
evidence package versions
generation runs
model and prompt version references
scores and rankings
recommendation versions
publication packages
handoff acknowledgements
deployment evidence
rollback evidence
```

## Event functions

Create canonical equivalents of:

```text
adi.decision.requested
adi.decision.generated
adi.decision.failed
adi.recommendation.published
```

Reuse canonical outbox and preserve lineage.

## Repositories

Implement at minimum:

```text
DecisionRequestRepository
DecisionEvidenceRepository
DecisionCandidateRepository
DecisionScoringRepository
DecisionRankingRepository
DecisionExplanationRepository
DecisionRecommendationRepository
DecisionGenerationRepository
DecisionUsageRepository
DecisionPublicationRepository
DecisionHandoffRepository
DecisionDeploymentRepository
```

## Live PostgreSQL 16 tests

Cover:

- request lifecycle and idempotency;
- input lineage;
- evidence quality, limitations, provenance;
- candidate creation and versioning;
- scoring and ranking;
- alternatives, tradeoffs, counterfactuals;
- safety and policy checks;
- human-review requirements;
- recommendation publication;
- model/prompt version references;
- token/cost attribution;
- handoff acknowledgement/rejection/revocation;
- event outbox atomicity;
- RLS and rollback;
- registry/deployment/rollback.

Target at least 120 meaningful live integration tests.

## Documentation

Create:

```text
docs/database/stage-2g-ai-decision-intelligence.md
docs/database/adi-schema.md
docs/database/adi-evidence-lineage.md
docs/database/adi-scoring-ranking.md
docs/database/adi-safety-human-review.md
docs/database/adi-events.md
docs/database/adi-repositories.md
docs/database/adi-rls.md
docs/database/adi-test-plan.md
```

## Validation

Run standard workspace, lint, typecheck, test, build, and PostgreSQL integration commands. Apply all migrations from empty PostgreSQL 16 and rerun for idempotency.

## Prohibited work

Do not implement approvals, execution, OM, CL, frontend, external AI providers, event relay, automatic approval, or edits to frozen migrations.

## Stop condition

Stop after schema, constraints, indexes, RLS, versioning, events, repositories, live tests, idempotency, documentation, and migration freeze are complete.

Do not begin Stage 2H.

## Completion report

Return exact migration range, totals, validation, safety checks, cost/token attribution, security, limitations, and:

```text
Next recommended task:
Database Stage 2H — Approved Business Action
```
