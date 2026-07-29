# INFINICUS ABA-18 — Pre-Execution Simulation and Dry-Run Engine

Version: 1.0.0

ABA-18 validates prepared execution envelopes without causing real-world side effects.

Public API:

`window.INFINICUS.ABA.preExecutionDryRunEngine`

## Capabilities

- Dry-run policy registry
- Payload schema validation
- Endpoint and credential-reference checks
- Idempotency validation
- Side-effect prohibition
- Mock connector invocation
- Expected-response validation
- Timeout and retry validation
- Resource and assignment rechecks
- Risk and boundary confirmation
- Dry-run evidence registry
- ABA-19 controlled-execution handoff
- IndexedDB persistence
