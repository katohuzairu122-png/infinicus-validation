# Integration Contract

1. Load ADI-01 before every other modular ADI block.
2. Obtain the runtime through `createADIRuntime()` or `installGlobal()`.
3. Register one uniquely named service and one or more `adi.*` routes per block.
4. Return `{ ok, data, error, meta }` result envelopes from all routes.
5. Publish auditable events for material state changes.
6. Carry `tenantId`, `businessId`, `decisionId`, `correlationId` and `traceId` across layer boundaries.
7. Use adapters for the existing Business Intelligence, Digital Twin and Simulation Engine implementations.
8. Send recommendations to ABA only through a registered handoff contract.
9. Do not edit or replace the legacy consolidated Decision Intelligence HTML.
