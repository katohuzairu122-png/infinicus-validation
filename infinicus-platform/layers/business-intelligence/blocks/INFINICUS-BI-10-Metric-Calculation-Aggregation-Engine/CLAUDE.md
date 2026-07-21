# Claude Instructions — BI-10

- Load BI-01 through BI-09 before BI-10.
- Calculate only approved metric definitions.
- Preserve metric, result, calculation run, dataset, snapshot, and correlation identifiers.
- Respect metric dependencies and calculate them in topological order.
- Apply filters before aggregation.
- Apply dimensions and time grain deterministically.
- Do not change BI-09 metric definitions during calculation.
- Store calculation evidence and version information.
- Avoid external dependencies.
