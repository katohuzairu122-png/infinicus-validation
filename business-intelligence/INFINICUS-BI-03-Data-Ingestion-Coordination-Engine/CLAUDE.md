# Claude Instructions — BI-03

- Load BI-01 and BI-02 before BI-03.
- Every ingestion run must reference a published dataset contract.
- Preserve source-system, contract, job, run, cursor, watermark, and correlation identifiers.
- Reject duplicate idempotency keys.
- Do not silently skip failed records.
- Record accepted, rejected, and pending record counts separately.
- Keep data-quality evaluation in BI-04.
- Keep transformation logic limited to approved BI-02 mappings.
- Avoid external dependencies.
