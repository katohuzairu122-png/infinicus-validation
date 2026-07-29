export function createDuplicateStore() {
  const keys = new Map();
  const compound = request => `${request.tenantId}::${request.businessId}::${request.idempotencyKey}`;
  return Object.freeze({
    find(request) { return request.idempotencyKey ? keys.get(compound(request)) ?? null : null; },
    remember(request, decisionCase) { if (request.idempotencyKey) keys.set(compound(request), decisionCase); },
    size() { return keys.size; }
  });
}
