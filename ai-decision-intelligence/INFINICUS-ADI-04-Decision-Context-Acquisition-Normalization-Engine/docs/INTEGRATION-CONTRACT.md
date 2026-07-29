# ADI-04 Integration Contract

- Load order: after ADI-01, ADI-03.
- Registers service `adi.decision_context` on the ADI-01 runtime.
- All results use the standard envelope `{ ok, data, error, meta }`.
- Tenant and business boundary fields (`tenantId`, `businessId`) are required on all persistent queries.
- Analytical output only; no business action is approved or executed by this block.
