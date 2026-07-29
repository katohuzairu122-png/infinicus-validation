# Claude Instructions — BI-09

- Load BI-01 through BI-08 before BI-09.
- Every metric must reference a governed BI-08 warehouse dataset.
- Preserve metric, KPI, dataset, version, owner, lineage, and correlation identifiers.
- Define grain, aggregation, filters, and units explicitly.
- Do not calculate metrics in BI-09.
- Keep metric evaluation in BI-10.
- Reject circular metric dependencies.
- Version every breaking metric change.
- Avoid external dependencies.
