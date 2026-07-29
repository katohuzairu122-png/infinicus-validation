# ABA-18 Instructions

- Load ABA-01 through ABA-17 before ABA-18.
- Dry runs must not produce real external side effects.
- Do not call production connectors directly.
- Use mock, sandbox, validation-only, or no-op adapters.
- Preserve schedule, queue item, action, task, adapter, connector, idempotency, correlation, lineage, and confidence identifiers.
- Record dry-run evidence and all failures.
- Only successful dry runs may proceed to ABA-19.
