# Claude Instructions — DT-01

- Treat DT-01 as the mandatory foundation for every Business Digital Twin block.
- Load DT-01 before DT-02 through DT-24.
- Use `window.INFINICUS.DT.runtime` for registration, routing, events, diagnostics, and identifiers.
- Preserve correlation, causation, twin, state, entity, and lifecycle identifiers.
- Do not mutate objects supplied by other blocks.
- Register every service and route explicitly.
- Keep the runtime independent from databases, frameworks, and external packages.
- Avoid hidden global state outside the DT namespace.
