# INFINICUS ABA-20 — Execution Failure, Compensation and Rollback Engine

Version: 1.0.0

ABA-20 classifies execution failures and coordinates retry, compensation, rollback, containment, and escalation actions.

Public API:

`window.INFINICUS.ABA.executionFailureRollbackEngine`

## Capabilities

- Failure-policy registry
- Failure classification
- Retry eligibility
- Compensation-action registry
- Rollback-plan registry
- Reverse-order rollback execution
- Partial-completion containment
- Manual intervention state
- Irreversible-action escalation
- Compensation evidence
- ABA-21 execution-evidence handoff
- IndexedDB persistence
