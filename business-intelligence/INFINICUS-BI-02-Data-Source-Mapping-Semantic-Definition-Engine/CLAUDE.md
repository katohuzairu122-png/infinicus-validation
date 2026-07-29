# Claude Instructions — BI-02

- Load BI-01 before BI-02.
- Preserve source-system, source-field, entity, fact, dimension, mapping, and contract identifiers.
- Do not invent source fields.
- Separate source names from canonical semantic names.
- Every mapping must record lineage.
- Reject incompatible data types unless an explicit conversion rule exists.
- Version all published dataset contracts.
- Keep ingestion execution outside BI-02.
- Avoid external dependencies.
