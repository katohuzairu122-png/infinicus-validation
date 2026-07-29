# ADI-11 Integration Contract

- Load order: after ADI-01, ADI-07, ADI-08, ADI-09, ADI-10.
- Registers service `adi.context_evidence_assembly` on the ADI-01 runtime.
- All results use the standard envelope `{ ok, data, error, meta }`.
- Tenant and business boundary fields (`tenantId`, `businessId`) are required on all persistent queries.
- Analytical output only; no business action is approved or executed by this block.
