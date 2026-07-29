# ADI-25 Integration Contract

- Load order: after ADI-01, ADI-02, ADI-03, ADI-04, ADI-05, ADI-06, ADI-07, ADI-08, ADI-09, ADI-10, ADI-11, ADI-12, ADI-13, ADI-14, ADI-15, ADI-16, ADI-17, ADI-18, ADI-19, ADI-20, ADI-21, ADI-22, ADI-23, ADI-24.
- Registers service `adi.master_integration` on the ADI-01 runtime.
- All results use the standard envelope `{ ok, data, error, meta }`.
- Tenant and business boundary fields (`tenantId`, `businessId`) are required on all persistent queries.
- Diagnoses all 25 ADI services; reports missing or misidentified services.
