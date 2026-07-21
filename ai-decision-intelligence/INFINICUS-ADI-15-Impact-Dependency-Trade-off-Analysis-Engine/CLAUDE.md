# ADI-15 Instructions

- Use namespace `window.INFINICUS.ADI`.
- Attach through `attachToADIRuntime(runtime, options)` after ADI-13, ADI-14.
- Register services and routes through the ADI-01 runtime only.
- Preserve correlation, causation, lineage, and confidence identifiers.
- Do not mutate caller-owned objects; return frozen records.
- Return standard success and failure envelopes (`{ ok, data, error, meta }`).
- Never bypass upstream validation from DT, BI, or Simulation layers.
- Never store secrets or credentials in browser-visible configuration.
