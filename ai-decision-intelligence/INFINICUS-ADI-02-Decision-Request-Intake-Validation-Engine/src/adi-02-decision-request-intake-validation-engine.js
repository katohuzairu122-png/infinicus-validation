/* --- ai-decision-intelligence/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/adi-02-decision-request-intake-validation-engine.js --- */
(function(global){
"use strict";
var __adiBlockExports = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    DECISION_TYPES: () => DECISION_TYPES,
    REQUEST_SOURCES: () => REQUEST_SOURCES,
    SCOPE_LEVELS: () => SCOPE_LEVELS,
    URGENCY_LEVELS: () => URGENCY_LEVELS,
    VALIDATION_STATUSES: () => VALIDATION_STATUSES,
    attachToADIRuntime: () => attachToADIRuntime,
    classifyRequest: () => classifyRequest,
    createDecisionRequestIntakeEngine: () => createDecisionRequestIntakeEngine,
    createDuplicateStore: () => createDuplicateStore,
    normalizeDecisionRequest: () => normalizeDecisionRequest,
    validateDecisionRequest: () => validateDecisionRequest
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/normalizer.js
  function text(value) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  }
  function list(value) {
    return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
  }
  function normalizeDecisionRequest(input = {}) {
    return Object.freeze({
      requestId: text(input.requestId),
      tenantId: text(input.tenantId),
      businessId: text(input.businessId),
      requestSource: text(input.requestSource).toLowerCase(),
      requesterId: text(input.requesterId),
      requesterType: text(input.requesterType || "user").toLowerCase(),
      title: text(input.title),
      statement: text(input.statement),
      desiredOutcome: text(input.desiredOutcome),
      decisionType: text(input.decisionType).toLowerCase(),
      decisionDeadline: text(input.decisionDeadline),
      urgency: text(input.urgency || "medium").toLowerCase(),
      scope: text(input.scope || "business").toLowerCase(),
      constraints: Object.freeze(list(input.constraints)),
      evidenceRefs: Object.freeze(list(input.evidenceRefs)),
      goalIds: Object.freeze(list(input.goalIds)),
      triggerIds: Object.freeze(list(input.triggerIds)),
      correlationId: text(input.correlationId),
      traceId: text(input.traceId),
      idempotencyKey: text(input.idempotencyKey),
      submittedAt: text(input.submittedAt)
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/constants.js
  var REQUEST_SOURCES = Object.freeze([
    "human",
    "business_intelligence",
    "business_digital_twin",
    "simulation_engine",
    "outcome_monitoring",
    "continuous_learning",
    "system"
  ]);
  var DECISION_TYPES = Object.freeze([
    "problem",
    "opportunity",
    "risk_response",
    "goal_based",
    "trigger_generated",
    "simulation_warning",
    "intelligence_alert",
    "corrective_action",
    "reassessment"
  ]);
  var URGENCY_LEVELS = Object.freeze(["low", "medium", "high", "critical"]);
  var SCOPE_LEVELS = Object.freeze(["team", "function", "business", "portfolio", "ecosystem"]);
  var VALIDATION_STATUSES = Object.freeze([
    "accepted",
    "accepted_with_warnings",
    "needs_information",
    "duplicate",
    "unauthorized",
    "unsupported",
    "rejected"
  ]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/validator.js
  var SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,159}$/;
  function validateDecisionRequest(request, now = /* @__PURE__ */ new Date()) {
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
    if (request.statement.length < 20 || request.statement.length > 5e3) errors.push({ field: "statement", code: "INVALID_LENGTH", message: "Statement must contain 20 to 5000 characters." });
    if (request.desiredOutcome.length < 10 || request.desiredOutcome.length > 2e3) errors.push({ field: "desiredOutcome", code: "INVALID_LENGTH", message: "Desired outcome must contain 10 to 2000 characters." });
    const deadline = Date.parse(request.decisionDeadline);
    if (!request.decisionDeadline || Number.isNaN(deadline)) errors.push({ field: "decisionDeadline", code: "INVALID_DATE", message: "A valid decision deadline is required." });
    else if (deadline <= now.getTime()) errors.push({ field: "decisionDeadline", code: "DEADLINE_PASSED", message: "Decision deadline must be in the future." });
    if (!request.correlationId) warnings.push({ field: "correlationId", code: "GENERATED_BY_ENGINE", message: "A correlation ID will be generated." });
    if (!request.traceId) warnings.push({ field: "traceId", code: "GENERATED_BY_ENGINE", message: "A trace ID will be generated." });
    if (!request.evidenceRefs.length) warnings.push({ field: "evidenceRefs", code: "NO_EVIDENCE", message: "No evidence reference was supplied." });
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/classifier.js
  var PRIORITY = Object.freeze({ low: 25, medium: 50, high: 75, critical: 100 });
  var SCOPE_WEIGHT = Object.freeze({ team: 0, function: 3, business: 6, portfolio: 9, ecosystem: 12 });
  function classifyRequest(request) {
    const priorityScore = Math.min(100, PRIORITY[request.urgency] + SCOPE_WEIGHT[request.scope]);
    const lane = request.urgency === "critical" ? "expedited" : request.urgency === "high" ? "priority" : "standard";
    return Object.freeze({ decisionType: request.decisionType, priorityScore, processingLane: lane });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/duplicate-store.js
  function createDuplicateStore() {
    const keys = /* @__PURE__ */ new Map();
    const compound = (request) => `${request.tenantId}::${request.businessId}::${request.idempotencyKey}`;
    return Object.freeze({
      find(request) {
        return request.idempotencyKey ? keys.get(compound(request)) ?? null : null;
      },
      remember(request, decisionCase) {
        if (request.idempotencyKey) keys.set(compound(request), decisionCase);
      },
      size() {
        return keys.size;
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/decision-case.js
  function fallbackId(prefix) {
    return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  }
  function createDecisionCase(request, classification, validation, createId = fallbackId) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return Object.freeze({
      decisionId: createId("decision"),
      requestId: request.requestId || createId("request"),
      tenantId: request.tenantId,
      businessId: request.businessId,
      requestSource: request.requestSource,
      requesterId: request.requesterId,
      requesterType: request.requesterType,
      title: request.title,
      statement: request.statement,
      desiredOutcome: request.desiredOutcome,
      decisionType: classification.decisionType,
      decisionDeadline: request.decisionDeadline,
      urgency: request.urgency,
      priorityScore: classification.priorityScore,
      processingLane: classification.processingLane,
      scope: request.scope,
      constraints: request.constraints,
      evidenceRefs: request.evidenceRefs,
      goalIds: request.goalIds,
      triggerIds: request.triggerIds,
      correlationId: request.correlationId || createId("correlation"),
      traceId: request.traceId || createId("trace"),
      idempotencyKey: request.idempotencyKey || null,
      validationStatus: validation.warnings.length ? "accepted_with_warnings" : "accepted",
      validationWarnings: validation.warnings,
      missingInformation: Object.freeze([]),
      recommendedRoute: "adi.context_evidence.assemble",
      status: "received",
      statusHistory: Object.freeze([]),
      submittedAt: request.submittedAt || now,
      createdAt: now,
      updatedAt: now,
      schemaVersion: "1.0.0"
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({
    ok: true,
    data,
    error: null,
    meta: Object.freeze({ ...meta })
  });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({
    ok: false,
    data: null,
    error: Object.freeze({ code, message, details }),
    meta: Object.freeze({ ...meta })
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/intake-engine.js
  function createDecisionRequestIntakeEngine(options = {}) {
    const authorize = options.authorize ?? (async () => ({ allowed: false, reason: "Authorization adapter is not configured." }));
    const duplicateStore = options.duplicateStore ?? createDuplicateStore();
    const createId = options.createId;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    async function submit(input = {}, context = {}) {
      const request = normalizeDecisionRequest(input);
      const auth = await authorize({
        requesterId: request.requesterId,
        tenantId: request.tenantId,
        businessId: request.businessId,
        action: "adi.decision_request.submit",
        context
      });
      if (!auth?.allowed) {
        await emit("adi.decision_request.unauthorized", { tenantId: request.tenantId, businessId: request.businessId, requesterId: request.requesterId });
        return failure("ADI_REQUEST_UNAUTHORIZED", "Requester is not authorized for this business.", null, { validationStatus: "unauthorized" });
      }
      const validation = validateDecisionRequest(request, now());
      if (!validation.valid) {
        const unsupported = validation.errors.some((item) => item.code.startsWith("UNSUPPORTED"));
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
        tenantId: decisionCase.tenantId,
        businessId: decisionCase.businessId,
        decisionId: decisionCase.decisionId,
        traceId: decisionCase.traceId
      });
      return success(decisionCase, { validationStatus: decisionCase.validationStatus });
    }
    return Object.freeze({ blockId: "ADI-02", version: "1.0.0", submit });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "emit", "createId"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) {
      return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    }
    const engine = createDecisionRequestIntakeEngine({
      ...options,
      createId: runtime.createId,
      emit: runtime.emit
    });
    const service = runtime.registerService("adi.decision_request_intake", engine, { blockId: "ADI-02", version: "1.0.0" });
    if (!service.ok) return service;
    const route = runtime.registerRoute("adi.decision_request.submit", (request, context) => engine.submit(request, context), { blockId: "ADI-02" });
    if (!route.ok) return route;
    void runtime.emit("adi.block.ready", { blockId: "ADI-02", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-02", version: "1.0.0", service: "adi.decision_request_intake", route: "adi.decision_request.submit" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-02"] = __adiBlockExports;
})(window);
