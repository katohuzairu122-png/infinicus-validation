# ADI-05 Integration Contract

- Load order: after ADI-01, ADI-04.
- Registers service `adi.digital_twin_context_adapter` on the ADI-01 runtime.
- All results use the standard envelope `{ ok, data, error, meta }`.
- Tenant and business boundary fields (`tenantId`, `businessId`) are required on all persistent queries.
- Analytical output only; no business action is approved or executed by this block.
