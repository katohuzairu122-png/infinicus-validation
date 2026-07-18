function fallbackId(prefix) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
}

export function createDecisionCase(request, classification, validation, createId = fallbackId) {
  const now = new Date().toISOString();
  return Object.freeze({
    decisionId: createId("decision"), requestId: request.requestId || createId("request"),
    tenantId: request.tenantId, businessId: request.businessId,
    requestSource: request.requestSource, requesterId: request.requesterId, requesterType: request.requesterType,
    title: request.title, statement: request.statement, desiredOutcome: request.desiredOutcome,
    decisionType: classification.decisionType, decisionDeadline: request.decisionDeadline,
    urgency: request.urgency, priorityScore: classification.priorityScore,
    processingLane: classification.processingLane, scope: request.scope,
    constraints: request.constraints, evidenceRefs: request.evidenceRefs,
    goalIds: request.goalIds, triggerIds: request.triggerIds,
    correlationId: request.correlationId || createId("correlation"),
    traceId: request.traceId || createId("trace"), idempotencyKey: request.idempotencyKey || null,
    validationStatus: validation.warnings.length ? "accepted_with_warnings" : "accepted",
    validationWarnings: validation.warnings, missingInformation: Object.freeze([]),
    recommendedRoute: "adi.context_evidence.assemble", status: "received",
    statusHistory: Object.freeze([]), submittedAt: request.submittedAt || now,
    createdAt: now, updatedAt: now, schemaVersion: "1.0.0"
  });
}
