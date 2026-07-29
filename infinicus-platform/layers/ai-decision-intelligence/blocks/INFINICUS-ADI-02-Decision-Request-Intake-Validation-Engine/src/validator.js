import { REQUEST_SOURCES, DECISION_TYPES, URGENCY_LEVELS, SCOPE_LEVELS } from "./constants.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,159}$/;

export function validateDecisionRequest(request, now = new Date()) {
  const errors = [];
  const warnings = [];
  const requiredIds = ["tenantId", "businessId", "requesterId"];
  for (const field of requiredIds) {
    if (!SAFE_ID.test(request[field] ?? "")) errors.push({ field, code: "INVALID_ID", message: `${field} is required and must be a safe identifier.` });
  }
  if (!REQUEST_SOURCES.includes(request.requestSource)) errors.push({ field: "requestSource", code: "UNSUPPORTED_SOURCE", message: "Unsupported request source." });
  if (!DECISION_TYPES.includes(request.decisionType)) errors.push({ field: "decisionType", code: "UNSUPPORTED_TYPE", message: "Unsupported decision type." });
  if (!URGENCY_LEVELS.includes(request.urgency)) errors.push({ field: "urgency", code: "INVALID_URGENCY", message: "Invalid urgency." });
  if (!SCOPE_LEVELS.includes(request.scope)) errors.push({ field: "scope", code: "INVALID_SCOPE", message: "Invalid business scope." });
  if (request.title.length < 5 || request.title.length > 180) errors.push({ field: "title", code: "INVALID_LENGTH", message: "Title must contain 5 to 180 characters." });
  if (request.statement.length < 20 || request.statement.length > 5000) errors.push({ field: "statement", code: "INVALID_LENGTH", message: "Statement must contain 20 to 5000 characters." });
  if (request.desiredOutcome.length < 10 || request.desiredOutcome.length > 2000) errors.push({ field: "desiredOutcome", code: "INVALID_LENGTH", message: "Desired outcome must contain 10 to 2000 characters." });
  const deadline = Date.parse(request.decisionDeadline);
  if (!request.decisionDeadline || Number.isNaN(deadline)) errors.push({ field: "decisionDeadline", code: "INVALID_DATE", message: "A valid decision deadline is required." });
  else if (deadline <= now.getTime()) errors.push({ field: "decisionDeadline", code: "DEADLINE_PASSED", message: "Decision deadline must be in the future." });
  if (!request.correlationId) warnings.push({ field: "correlationId", code: "GENERATED_BY_ENGINE", message: "A correlation ID will be generated." });
  if (!request.traceId) warnings.push({ field: "traceId", code: "GENERATED_BY_ENGINE", message: "A trace ID will be generated." });
  if (!request.evidenceRefs.length) warnings.push({ field: "evidenceRefs", code: "NO_EVIDENCE", message: "No evidence reference was supplied." });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
}
