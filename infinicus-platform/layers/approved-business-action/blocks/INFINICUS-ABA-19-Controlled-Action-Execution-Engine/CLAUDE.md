# ABA-19 Instructions

- Load ABA-01 through ABA-18 before ABA-19.
- Execute only dry-run-passed envelopes.
- Require valid idempotency keys and queue leases where configured.
- Never expose secrets in execution logs.
- Preserve action, task, schedule, queue, adapter, connector, reservation, actor, correlation, lineage, and confidence identifiers.
- Record every attempt and external response.
- Send failures and partial completions to ABA-20.
