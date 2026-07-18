# Integration Contract

1. Initialize ADI-01.
2. Call `attachToADIRuntime(runtime, { authorize, duplicateStore })`.
3. Submit through `runtime.dispatch("adi.decision_request.submit", request, context)`.
4. Listen for `adi.decision_request.accepted`, `.invalid`, `.duplicate` and `.unauthorized`.
5. Persist the returned DecisionCase through a registered repository adapter.
6. Route accepted cases to ADI-11 only after the required ADI-03 through ADI-10 enrichment steps are present.
7. Maintain the same `tenantId`, `businessId`, `decisionId`, `correlationId` and `traceId` through all handoffs.
8. Never send an intake request directly to ABA; only ADI-24 publishes a completed decision package.
9. Do not rewrite the original Simulation Engine or consolidated Decision Intelligence HTML.
