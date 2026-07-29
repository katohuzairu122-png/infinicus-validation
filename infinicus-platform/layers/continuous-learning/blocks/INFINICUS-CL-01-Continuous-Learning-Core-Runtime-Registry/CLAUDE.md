# CL-01 Instructions

- Use namespace `window.INFINICUS.CL`.
- CL-01 must load before every other Continuous Learning block.
- Register services and routes through the runtime.
- Preserve correlation, confidence, reliability, provenance, and lineage identifiers.
- Do not mutate caller-owned objects.
- Return standard success and failure envelopes.
- Emit governed runtime events for registrations and state changes.
- Keep the runtime independent from storage and business-specific learning logic.
