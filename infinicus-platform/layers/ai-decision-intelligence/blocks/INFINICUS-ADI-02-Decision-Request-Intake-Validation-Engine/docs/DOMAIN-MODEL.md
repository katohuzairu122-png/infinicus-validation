# DecisionCase

The canonical output includes:

- Identity: `decisionId`, `requestId`, `tenantId`, `businessId`
- Source: `requestSource`, `requesterId`, `requesterType`
- Definition: `title`, `statement`, `desiredOutcome`, `decisionType`
- Governance: `decisionDeadline`, `urgency`, `priorityScore`, `processingLane`, `scope`
- Context references: `constraints`, `evidenceRefs`, `goalIds`, `triggerIds`
- Traceability: `correlationId`, `traceId`, `idempotencyKey`
- Validation: `validationStatus`, `validationWarnings`, `missingInformation`
- Routing: `recommendedRoute`, `status`, `statusHistory`
- Time and schema fields

The object is immutable at creation. Later blocks produce new versions through governed lifecycle transitions.
