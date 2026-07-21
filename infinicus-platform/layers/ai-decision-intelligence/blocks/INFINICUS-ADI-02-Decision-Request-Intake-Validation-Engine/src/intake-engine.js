import { normalizeDecisionRequest } from "./normalizer.js";
import { validateDecisionRequest } from "./validator.js";
import { classifyRequest } from "./classifier.js";
import { createDuplicateStore } from "./duplicate-store.js";
import { createDecisionCase } from "./decision-case.js";
import { success, failure } from "./result-envelope.js";

export function createDecisionRequestIntakeEngine(options = {}) {
  const authorize = options.authorize ?? (async () => ({ allowed: false, reason: "Authorization adapter is not configured." }));
  const duplicateStore = options.duplicateStore ?? createDuplicateStore();
  const createId = options.createId;
  const emit = options.emit ?? (async () => success());
  const now = options.now ?? (() => new Date());

  async function submit(input = {}, context = {}) {
    const request = normalizeDecisionRequest(input);
    const auth = await authorize({
      requesterId: request.requesterId, tenantId: request.tenantId,
      businessId: request.businessId, action: "adi.decision_request.submit", context
    });
    if (!auth?.allowed) {
      await emit("adi.decision_request.unauthorized", { tenantId: request.tenantId, businessId: request.businessId, requesterId: request.requesterId });
      return failure("ADI_REQUEST_UNAUTHORIZED", "Requester is not authorized for this business.", null, { validationStatus: "unauthorized" });
    }

    const validation = validateDecisionRequest(request, now());
    if (!validation.valid) {
      const unsupported = validation.errors.some(item => item.code.startsWith("UNSUPPORTED"));
      const status = unsupported ? "unsupported" : "needs_information";
      await emit("adi.decision_request.invalid", { tenantId: request.tenantId, businessId: request.businessId, status, errors: validation.errors });
      return failure("ADI_REQUEST_INVALID", "Decision request failed validation.", { errors: validation.errors, warnings: validation.warnings }, { validationStatus: status });
    }

    const duplicate = duplicateStore.find(request);
    if (duplicate) {
      await emit("adi.decision_request.duplicate", { decisionId: duplicate.decisionId, tenantId: request.tenantId, businessId: request.businessId });
      return success(duplicate, { validationStatus: "duplicate", duplicate: true });
    }

    const classification = classifyRequest(request);
    const decisionCase = createDecisionCase(request, classification, validation, createId);
    duplicateStore.remember(request, decisionCase);
    await emit("adi.decision_request.accepted", decisionCase, {
      tenantId: decisionCase.tenantId, businessId: decisionCase.businessId,
      decisionId: decisionCase.decisionId, traceId: decisionCase.traceId
    });
    return success(decisionCase, { validationStatus: decisionCase.validationStatus });
  }

  return Object.freeze({ blockId: "ADI-02", version: "1.0.0", submit });
}
