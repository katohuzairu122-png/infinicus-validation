# INFINICUS ABA-04 — Action Instance and Lifecycle Registry

Version: 1.0.0

ABA-04 creates governed business-action instances from validated ABA-03 action definitions and manages lifecycle state transitions.

Public API:

`window.INFINICUS.ABA.actionInstanceLifecycleRegistry`

## Capabilities

- Action instance creation
- Lifecycle-state enforcement
- Transition history
- Status reasons and actor records
- Optimistic version control
- Idempotent instance creation
- Expiry metadata
- Revocation metadata
- ABA-05 authority handoff
- IndexedDB persistence
