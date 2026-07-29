# ADI-02 Integration Contract

- Load order: after ADI-01.
- Registers service `adi.decision_request_intake` on the ADI-01 runtime.
- All results use the standard envelope `{ ok, data, error, meta }`.
- Tenant and business boundary fields (`tenantId`, `businessId`) are required on all persistent queries.
- Analytical output only; no business action is approved or executed by this block.
