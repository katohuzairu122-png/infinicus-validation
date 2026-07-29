# ADI-01 Instructions

- Use namespace `window.INFINICUS.ADI`.
- ADI-01 must load before every other AI Decision Intelligence block.
- Register services and routes through the ADI-01 runtime only.
- Preserve correlation, causation, lineage, and confidence identifiers.
- Do not mutate caller-owned objects; return frozen records.
- Return standard success and failure envelopes (`{ ok, data, error, meta }`).
- Never bypass upstream validation from DT, BI, or Simulation layers.
- Never store secrets or credentials in browser-visible configuration.
