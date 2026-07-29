# Claude Instructions — ADI-07

- Treat evidence records and provenance as immutable.
- Verify tenant, business and decision boundaries on every operation.
- Compute a deterministic SHA-256 content hash before registration.
- Never overwrite evidence content; supersede or revoke through lifecycle records.
- Preserve provider, source system, source record, schema, quality, freshness and acquisition timestamps.
- Never upgrade evidence quality or invent missing provenance.
- Do not generate conclusions, recommendations, approvals or actions.
- Register routes and services only through ADI-01.
