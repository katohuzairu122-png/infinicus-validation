function text(value) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""; }
function list(value) { return Array.isArray(value) ? value.map(text).filter(Boolean) : []; }

export function normalizeDecisionRequest(input = {}) {
  return Object.freeze({
    requestId: text(input.requestId), tenantId: text(input.tenantId), businessId: text(input.businessId),
    requestSource: text(input.requestSource).toLowerCase(), requesterId: text(input.requesterId),
    requesterType: text(input.requesterType || "user").toLowerCase(),
    title: text(input.title), statement: text(input.statement), desiredOutcome: text(input.desiredOutcome),
    decisionType: text(input.decisionType).toLowerCase(),
    decisionDeadline: text(input.decisionDeadline), urgency: text(input.urgency || "medium").toLowerCase(),
    scope: text(input.scope || "business").toLowerCase(),
    constraints: Object.freeze(list(input.constraints)), evidenceRefs: Object.freeze(list(input.evidenceRefs)),
    goalIds: Object.freeze(list(input.goalIds)), triggerIds: Object.freeze(list(input.triggerIds)),
    correlationId: text(input.correlationId), traceId: text(input.traceId),
    idempotencyKey: text(input.idempotencyKey), submittedAt: text(input.submittedAt)
  });
}
