# Claude Instructions — ADI-04

- Accept only a secured DecisionCase accompanied by an allowed ADI-03 AccessDecision.
- Acquire context only from registered providers within the same tenant and business boundary.
- Preserve source record IDs, timestamps, schemas and provenance.
- Never fabricate, estimate or silently replace missing values.
- Do not convert currencies without an explicit conversion adapter and rate timestamp.
- Flag conflicts, stale fragments, provider failures and quality limitations.
- Do not run simulations or create recommendations.
- Do not modify the existing Simulation Engine or consolidated Decision Intelligence HTML.
- Register services and routes through ADI-01.
