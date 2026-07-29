# Claude Instructions — DT-16

- Load DT-01 through DT-15 before DT-16.
- Preserve twin, business, state, version, source, lineage, confidence, freshness, conflict, and correlation identifiers.
- Do not silently overwrite conflicting high-confidence state.
- Apply source priority, freshness, and confidence policies explicitly.
- Preserve superseded state and synchronization evidence.
- Enforce idempotency for repeated handoffs.
- Keep state transitions and business events in DT-17.
- Avoid external dependencies.
