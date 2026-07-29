# ADI-22 Integration Contract

- Load order: after ADI-01, ADI-18, ADI-20, ADI-21.
- Registers service `adi.red_team_validation` on the ADI-01 runtime.
- All results use the standard envelope `{ ok, data, error, meta }`.
- Tenant and business boundary fields (`tenantId`, `businessId`) are required on all persistent queries.
- Analytical output only; no business action is approved or executed by this block.
