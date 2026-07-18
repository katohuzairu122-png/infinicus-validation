# Claude Instructions — ADI-05

- Keep this adapter read-only; never mutate or rebuild the Business Digital Twin.
- Require an injected Digital Twin reader and fail closed when it is absent.
- Enforce tenant, business and decision boundaries before returning context.
- Preserve snapshot ID, version, publication time, source schema and provenance.
- Never invent missing entities, metrics, relationships or assumptions.
- Surface stale, incomplete and unpublished snapshots as explicit errors or warnings.
- Register as an ADI-04 context provider through ADI-01.
- Do not run simulations, generate recommendations or approve actions.
