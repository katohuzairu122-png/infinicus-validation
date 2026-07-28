# INFINICUS DATABASE STAGE 2H — APPROVED BUSINESS ACTION IMPLEMENTATION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

This prompt is implementation-ready. Do not redesign. Inspect, align, implement, validate, freeze, and report.

Read Stages 2A–2G completion reports, frozen migration manifest, ABA blocks ABA-01 through ABA-25, Event Catalogue, Handoff Contracts, and existing database conventions.

## Objective

Implement Database Stage 2H only:

```text
Approved Business Action persistence
```

Canonical schema:

```text
approved_business_action
```

Use the next actual migration number after Stage 2G.

## Required table groups

### Approval candidates

```text
approval_candidates
approval_candidate_versions
approval_candidate_evidence
approval_candidate_risks
approval_candidate_limitations
```

### Approval policies and routes

```text
approval_policies
approval_policy_versions
approval_policy_conditions
approval_routes
approval_route_versions
approval_route_steps
approval_route_assignments
```

### Approval requests and decisions

```text
approval_requests
approval_request_versions
approval_request_status_history
approval_step_instances
approval_decisions
approval_decision_evidence
approval_delegations
approval_escalations
```

Statuses:

```text
draft
pending
in_review
approved
rejected
cancelled
expired
revoked
```

### Authorization and separation of duties

```text
approval_authorizations
approval_role_requirements
approval_actor_eligibility
approval_separation_of_duties_rules
approval_policy_check_results
```

### Approved actions

```text
approved_actions
approved_action_versions
approved_action_parameters
approved_action_constraints
approved_action_schedules
approved_action_status_history
```

### Execution plans and instructions

```text
action_execution_plans
action_execution_plan_versions
action_execution_steps
action_execution_instructions
action_execution_dependencies
```

### Execution records

```text
action_executions
action_execution_attempts
action_execution_step_records
action_execution_evidence
action_execution_errors
action_execution_status_history
```

Statuses:

```text
planned
scheduled
ready
executing
completed
partially_completed
failed
cancelled
reversed
```

### Cancellation, reversal, and rollback

```text
action_cancellations
action_reversal_requests
action_reversals
action_rollback_plans
action_rollback_records
```

### Monitoring handoff

```text
action_monitoring_packages
action_monitoring_package_versions
action_monitoring_items
action_handoff_receipts
action_handoff_acknowledgements
action_handoff_rejections
```

Target:

```text
outcome_monitoring
```

### Registry, deployment, and audit

```text
action_component_registry
action_component_versions
action_deployments
action_rollbacks
```

## Core rules

- ADI recommendation is input, not approval.
- Human authorization is explicit.
- High-risk actions require enhanced review.
- Separation of duties is enforced.
- Approval policy and route versions are immutable after activation.
- Execution cannot start before valid approval.
- Every execution attempt is auditable.
- Cancellation, reversal, and rollback are distinct.
- External execution credentials must never be stored in payloads.
- Monitoring package creation must be transactionally tied to approved/executed action state.

## Suggested migration grouping

```text
<next>_approved_business_action_schema.sql
<next+1>_aba_candidates_evidence.sql
<next+2>_aba_policies_routes.sql
<next+3>_aba_requests_decisions.sql
<next+4>_aba_authorization_separation_of_duties.sql
<next+5>_aba_approved_actions.sql
<next+6>_aba_execution_plans.sql
<next+7>_aba_execution_records.sql
<next+8>_aba_cancellation_reversal_rollback.sql
<next+9>_aba_monitoring_handoffs.sql
<next+10>_aba_registry_deployment.sql
<next+11>_aba_indexes.sql
<next+12>_aba_rls.sql
<next+13>_aba_triggers.sql
<next+14>_aba_event_functions.sql
```

## Constraints

Enforce valid states, positive versions, actor eligibility, approval step order, unique active policy/route versions, unique approval request idempotency, distinct actors where required, valid schedules, no execution before approval, unique execution attempts, and valid target layer.

## RLS

Enable RLS on every tenant-owned table. Enforce tenant, workspace, business, and authorized actor scope. Missing context fails closed.

## Immutability

Immutable:

```text
approval decisions
decision evidence
policy and route versions used by requests
approved action versions
execution attempts
execution evidence
reversal and rollback evidence
handoff acknowledgements
deployment evidence
```

## Event functions

Create canonical equivalents of:

```text
aba.approval.requested
aba.action.approved
aba.action.rejected
aba.action.executed
aba.action.failed
aba.action.reversed
```

Reuse canonical outbox and preserve lineage.

## Repositories

Implement at minimum:

```text
ApprovalCandidateRepository
ApprovalPolicyRepository
ApprovalRouteRepository
ApprovalRequestRepository
ApprovalDecisionRepository
ApprovedActionRepository
ActionExecutionPlanRepository
ActionExecutionRepository
ActionReversalRepository
ActionMonitoringPackageRepository
ActionHandoffRepository
ActionDeploymentRepository
```

## Live PostgreSQL 16 tests

Cover:

- candidate creation and evidence;
- policy/route versioning;
- request lifecycle;
- actor authorization;
- separation of duties;
- dual approval;
- delegation and escalation;
- approval/rejection/revocation;
- approved action creation;
- execution plan and dependencies;
- execution attempts and evidence;
- cancellation, reversal, rollback;
- monitoring package and handoff;
- event outbox atomicity;
- RLS and rollback;
- registry/deployment.

Target at least 130 meaningful live integration tests.

## Documentation

Create:

```text
docs/database/stage-2h-approved-business-action.md
docs/database/aba-schema.md
docs/database/aba-approval-policies-routes.md
docs/database/aba-separation-of-duties.md
docs/database/aba-execution-evidence.md
docs/database/aba-events.md
docs/database/aba-repositories.md
docs/database/aba-rls.md
docs/database/aba-test-plan.md
```

## Validation

Run standard workspace, lint, typecheck, test, build, and PostgreSQL integration commands. Apply all migrations from empty PostgreSQL 16 and rerun for idempotency.

## Prohibited work

Do not implement external action adapters, autonomous approval, OM, CL, frontend, event relay, or edits to frozen migrations.

## Stop condition

Stop after approvals, policies, routes, SoD, actions, execution, reversals, monitoring handoff, RLS, events, repositories, tests, idempotency, documentation, and migration freeze are complete.

Do not begin Stage 2I.

## Completion report

Return exact migration range, totals, approval and SoD verification, execution evidence, security, limitations, and:

```text
Next recommended task:
Database Stage 2I — Outcome Monitoring
```
