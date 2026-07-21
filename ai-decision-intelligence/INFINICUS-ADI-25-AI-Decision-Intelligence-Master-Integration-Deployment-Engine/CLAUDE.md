# ADI-25 Instructions

- Use namespace `window.INFINICUS.ADI`.
- Attach through `attachToADIRuntime(runtime, options)` after ADI-02, ADI-03, ADI-04, ADI-05, ADI-06, ADI-07, ADI-08, ADI-09, ADI-10, ADI-11, ADI-12, ADI-13, ADI-14, ADI-15, ADI-16, ADI-17, ADI-18, ADI-19, ADI-20, ADI-21, ADI-22, ADI-23, ADI-24.
- Register services and routes through the ADI-01 runtime only.
- Preserve correlation, causation, lineage, and confidence identifiers.
- Do not mutate caller-owned objects; return frozen records.
- Return standard success and failure envelopes (`{ ok, data, error, meta }`).
- Never bypass upstream validation from DT, BI, or Simulation layers.
- Never store secrets or credentials in browser-visible configuration.
