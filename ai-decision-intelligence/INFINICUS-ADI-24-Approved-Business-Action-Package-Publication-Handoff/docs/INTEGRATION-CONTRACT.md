# ADI-24 Integration Contract

- Load order: after ADI-01, ADI-20, ADI-21, ADI-23.
- Registers service `adi.aba_handoff` on the ADI-01 runtime.
- All results use the standard envelope `{ ok, data, error, meta }`.
- Tenant and business boundary fields (`tenantId`, `businessId`) are required on all persistent queries.
- Produces the ABA handoff package; ABA retains approval and execution authority.
