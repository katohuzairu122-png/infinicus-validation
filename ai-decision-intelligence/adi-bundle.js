/* ADI LAYER BUNDLE */
/* Auto-generated — do not edit directly */
/* Contains: INFINICUS-ADI-01 through INFINICUS-ADI-25 + bootstrap */

/* ===== INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/adi-01-ai-decision-intelligence-core-runtime-registry.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/index.js
  var src_exports = {};
  __export(src_exports, {
    ADI_BLOCK_MANIFEST: () => ADI_BLOCK_MANIFEST,
    DECISION_STATES: () => DECISION_STATES,
    createADIRuntime: () => createADIRuntime,
    createId: () => createId,
    createRegistry: () => createRegistry,
    failure: () => failure,
    installGlobal: () => installGlobal,
    lifecycle: () => lifecycle,
    success: () => success
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/result-envelope.js
  function success(data = null, meta = {}) {
    return Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  }
  function failure(code, message, details = null, meta = {}) {
    return Object.freeze({
      ok: false,
      data: null,
      error: Object.freeze({ code, message, details }),
      meta: Object.freeze({ ...meta })
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/id-factory.js
  var SAFE_PREFIX = /^[a-z][a-z0-9_]{1,31}$/i;
  function createId(prefix = "adi") {
    if (!SAFE_PREFIX.test(prefix)) throw new TypeError("Invalid ID prefix.");
    const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    return `${prefix}_${random}`;
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/registry.js
  function createRegistry(kind) {
    const records = /* @__PURE__ */ new Map();
    function register(id, value, metadata = {}) {
      if (typeof id !== "string" || !id.trim() || value == null) {
        return failure("ADI_REGISTRY_INVALID", `${kind} id and value are required.`);
      }
      if (records.has(id)) {
        return failure("ADI_REGISTRY_DUPLICATE", `${kind} already exists: ${id}`);
      }
      const record = Object.freeze({
        id,
        value,
        metadata: Object.freeze({ ...metadata }),
        registeredAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      records.set(id, record);
      return success({ id, metadata: record.metadata });
    }
    function get(id) {
      const record = records.get(id);
      return record ? success(record.value, { id }) : failure("ADI_REGISTRY_NOT_FOUND", `${kind} was not found: ${id}`);
    }
    function describe(id) {
      const record = records.get(id);
      return record ? success({ id: record.id, metadata: record.metadata, registeredAt: record.registeredAt }) : failure("ADI_REGISTRY_NOT_FOUND", `${kind} was not found: ${id}`);
    }
    function list() {
      return success([...records.values()].map(({ id, metadata, registeredAt }) => ({
        id,
        metadata: { ...metadata },
        registeredAt
      })));
    }
    return Object.freeze({ kind, register, get, describe, list, has: (id) => records.has(id) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/event-bus.js
  function createEventBus({ historyLimit = 1e3 } = {}) {
    const listeners = /* @__PURE__ */ new Map();
    const history = [];
    function subscribe(topic, handler) {
      if (!topic || typeof handler !== "function") {
        return failure("ADI_EVENT_SUBSCRIPTION_INVALID", "Topic and handler are required.");
      }
      const topicListeners = listeners.get(topic) ?? /* @__PURE__ */ new Set();
      topicListeners.add(handler);
      listeners.set(topic, topicListeners);
      return success(() => topicListeners.delete(handler));
    }
    async function emit(topic, payload = null, context = {}) {
      if (!topic) return failure("ADI_EVENT_TOPIC_REQUIRED", "Event topic is required.");
      const event = Object.freeze({
        eventId: createId("evt"),
        topic,
        payload,
        context: Object.freeze({ ...context }),
        occurredAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      history.push(event);
      if (history.length > historyLimit) history.splice(0, history.length - historyLimit);
      const handlers = [...listeners.get(topic) ?? [], ...listeners.get("*") ?? []];
      const errors = [];
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          errors.push(error.message);
        }
      }
      return success(event, errors.length ? { listenerErrors: errors } : {});
    }
    return Object.freeze({ subscribe, emit, history: () => success([...history]) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/route-registry.js
  function createRouteRegistry() {
    const registry = createRegistry("route");
    async function dispatch(name, request = {}, context = {}) {
      const resolved = registry.get(name);
      if (!resolved.ok) return resolved;
      try {
        return await resolved.data(request, context);
      } catch (error) {
        return failure("ADI_ROUTE_FAILED", `Route failed: ${name}`, { message: error.message });
      }
    }
    return Object.freeze({ register: registry.register, describe: registry.describe, list: registry.list, dispatch });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/lifecycle.js
  var DECISION_STATES = Object.freeze([
    "received",
    "validated",
    "analysing",
    "generating_options",
    "simulating",
    "scoring",
    "recommended",
    "handed_to_aba",
    "needs_data",
    "escalated",
    "rejected",
    "failed",
    "cancelled"
  ]);
  var TRANSITIONS = Object.freeze({
    received: ["validated", "needs_data", "rejected", "cancelled", "failed"],
    validated: ["analysing", "needs_data", "escalated", "cancelled", "failed"],
    needs_data: ["validated", "rejected", "cancelled"],
    analysing: ["generating_options", "needs_data", "escalated", "failed", "cancelled"],
    generating_options: ["simulating", "scoring", "needs_data", "failed", "cancelled"],
    simulating: ["scoring", "needs_data", "failed", "cancelled"],
    scoring: ["recommended", "escalated", "failed", "cancelled"],
    recommended: ["handed_to_aba", "escalated", "cancelled"],
    escalated: ["analysing", "rejected", "cancelled"],
    handed_to_aba: [],
    rejected: [],
    failed: [],
    cancelled: []
  });
  function canTransition(from, to) {
    return Boolean(TRANSITIONS[from]?.includes(to));
  }
  function transition(entity, to, reason = null) {
    if (!entity || !DECISION_STATES.includes(entity.status)) {
      return failure("ADI_LIFECYCLE_ENTITY_INVALID", "Entity has no valid ADI status.");
    }
    if (!DECISION_STATES.includes(to) || !canTransition(entity.status, to)) {
      return failure("ADI_LIFECYCLE_TRANSITION_INVALID", `Cannot transition ${entity.status} to ${to}.`);
    }
    const at = (/* @__PURE__ */ new Date()).toISOString();
    return success(Object.freeze({
      ...entity,
      status: to,
      updatedAt: at,
      statusHistory: Object.freeze([...entity.statusHistory ?? [], Object.freeze({ from: entity.status, to, reason, at })])
    }));
  }
  var lifecycle = Object.freeze({ states: DECISION_STATES, canTransition, transition });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/block-manifest.js
  var names = [
    "AI Decision Intelligence Core Runtime and Registry",
    "Decision Request Intake and Validation Engine",
    "Decision Identity, Ownership and Access Control Engine",
    "Decision Context Acquisition and Normalization Engine",
    "Business Digital Twin Context Adapter",
    "Simulation Engine Results Adapter",
    "Decision Evidence and Provenance Registry",
    "Business Goal Registry",
    "Decision Trigger Registry",
    "Business Problem Definition Engine",
    "Decision Context and Evidence Assembly Engine",
    "Decision Objectives, Constraints and Criteria Engine",
    "Strategic Alternative Generation Engine",
    "Alternative Feasibility and Eligibility Filter",
    "Impact, Dependency and Trade-off Analysis Engine",
    "Simulation Orchestration and Scenario Comparison Engine",
    "Risk, Opportunity and Downside Assessment Engine",
    "Multi-Criteria Decision Scoring and Ranking Engine",
    "Uncertainty, Confidence and Calibration Engine",
    "Explainability, Evidence Trace and Reasoning Engine",
    "Next-Best-Action and Recommendation Generation Engine",
    "Recommendation Challenge and Red-Team Validation Engine",
    "Decision Gate, Escalation and Human Review Engine",
    "Approved Business Action Package Publication and Handoff",
    "AI Decision Intelligence Master Integration and Deployment Engine"
  ];
  var ADI_BLOCK_MANIFEST = Object.freeze(names.map((name, index) => Object.freeze({
    blockId: `ADI-${String(index + 1).padStart(2, "0")}`,
    sequence: index + 1,
    name,
    required: true
  })));

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/runtime.js
  function createADIRuntime(options = {}) {
    const registries = Object.freeze({
      services: createRegistry("service"),
      capabilities: createRegistry("capability"),
      decisionTypes: createRegistry("decision type"),
      policies: createRegistry("policy"),
      models: createRegistry("model"),
      prompts: createRegistry("prompt"),
      dataSources: createRegistry("data source"),
      handoffContracts: createRegistry("handoff contract")
    });
    const routes = createRouteRegistry();
    const events = createEventBus({ historyLimit: options.eventHistoryLimit ?? 1e3 });
    const runtimeId = createId("runtime");
    const runtime = {
      runtimeId,
      blockId: "ADI-01",
      version: "1.0.0",
      lifecycle,
      success,
      failure,
      createId,
      registerService: registries.services.register,
      getService: registries.services.get,
      listServices: registries.services.list,
      registerCapability: registries.capabilities.register,
      listCapabilities: registries.capabilities.list,
      registerDecisionType: registries.decisionTypes.register,
      listDecisionTypes: registries.decisionTypes.list,
      registerPolicy: registries.policies.register,
      listPolicies: registries.policies.list,
      registerModel: registries.models.register,
      listModels: registries.models.list,
      registerPrompt: registries.prompts.register,
      listPrompts: registries.prompts.list,
      registerDataSource: registries.dataSources.register,
      listDataSources: registries.dataSources.list,
      registerHandoffContract: registries.handoffContracts.register,
      listHandoffContracts: registries.handoffContracts.list,
      registerRoute: routes.register,
      dispatch: routes.dispatch,
      listRoutes: routes.list,
      subscribe: events.subscribe,
      emit: events.emit,
      listEvents: events.history,
      getBlockManifest: () => success(ADI_BLOCK_MANIFEST.map((item) => ({ ...item }))),
      diagnose: () => success({
        runtimeId,
        blockId: "ADI-01",
        version: "1.0.0",
        state: "ready",
        services: registries.services.list().data.length,
        routes: routes.list().data.length,
        events: events.history().data.length
      })
    };
    Object.freeze(runtime);
    runtime.registerService("adi.core_runtime", runtime, { blockId: "ADI-01", version: "1.0.0" });
    runtime.registerRoute("adi.runtime.diagnose", async () => runtime.diagnose(), { blockId: "ADI-01" });
    runtime.registerRoute("adi.runtime.manifest", async () => runtime.getBlockManifest(), { blockId: "ADI-01" });
    void runtime.emit("adi.runtime.ready", { runtimeId, blockId: "ADI-01", version: "1.0.0" });
    return runtime;
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/index.js
  function installGlobal(target = globalThis) {
    target.INFINICUS ??= {};
    target.INFINICUS.ADI ??= {};
    if (target.INFINICUS.ADI.runtime) return target.INFINICUS.ADI.runtime;
    const runtime = createADIRuntime();
    target.INFINICUS.ADI.runtime = runtime;
    return runtime;
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-01"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine ===== */

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

/* ===== INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/adi-03-decision-identity-ownership-access-control-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    ACCESS_REASONS: () => ACCESS_REASONS,
    PERMISSIONS: () => PERMISSIONS,
    SUBJECT_TYPES: () => SUBJECT_TYPES,
    SYSTEM_ROLES: () => SYSTEM_ROLES,
    attachToADIRuntime: () => attachToADIRuntime,
    createAccessControlEngine: () => createAccessControlEngine,
    createAccessStore: () => createAccessStore,
    normalizeIdentity: () => normalizeIdentity
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/constants.js
  var PERMISSIONS = Object.freeze([
    "decision.create",
    "decision.view",
    "decision.update",
    "decision.assign",
    "decision.analyse",
    "decision.escalate",
    "decision.submit_to_aba",
    "decision.audit"
  ]);
  var SYSTEM_ROLES = Object.freeze({
    decision_viewer: ["decision.view"],
    decision_contributor: ["decision.create", "decision.view", "decision.update"],
    decision_analyst: ["decision.view", "decision.update", "decision.analyse"],
    decision_manager: ["decision.create", "decision.view", "decision.update", "decision.assign", "decision.analyse", "decision.escalate"],
    governance_reviewer: ["decision.view", "decision.escalate", "decision.submit_to_aba", "decision.audit"],
    system_service: ["decision.create", "decision.view", "decision.update", "decision.analyse"]
  });
  var SUBJECT_TYPES = Object.freeze(["user", "service", "agent"]);
  var ACCESS_REASONS = Object.freeze([
    "allowed_by_role",
    "owner_allowed",
    "identity_unresolved",
    "tenant_mismatch",
    "business_mismatch",
    "permission_missing",
    "explicitly_denied",
    "resource_invalid"
  ]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/access-store.js
  var scopeKey = (tenantId, businessId, subjectId) => `${tenantId}::${businessId}::${subjectId}`;
  var denyKey = (tenantId, businessId, subjectId, permission) => `${scopeKey(tenantId, businessId, subjectId)}::${permission}`;
  function createAccessStore() {
    const roles = new Map(Object.entries(SYSTEM_ROLES).map(([id, permissions]) => [id, Object.freeze([...permissions])]));
    const assignments = /* @__PURE__ */ new Map();
    const owners = /* @__PURE__ */ new Map();
    const denies = /* @__PURE__ */ new Set();
    return Object.freeze({
      registerRole(roleId, permissions) {
        if (!roleId || roles.has(roleId) || !Array.isArray(permissions) || permissions.some((item) => !PERMISSIONS.includes(item))) return false;
        roles.set(roleId, Object.freeze([...new Set(permissions)]));
        return true;
      },
      assignRole({ tenantId, businessId, subjectId, roleId }) {
        if (!roles.has(roleId) || !tenantId || !businessId || !subjectId) return false;
        const key = scopeKey(tenantId, businessId, subjectId);
        const set = assignments.get(key) ?? /* @__PURE__ */ new Set();
        set.add(roleId);
        assignments.set(key, set);
        return true;
      },
      rolesFor({ tenantId, businessId, subjectId }) {
        return [...assignments.get(scopeKey(tenantId, businessId, subjectId)) ?? []];
      },
      permissionsFor(subject) {
        return [...new Set(this.rolesFor(subject).flatMap((roleId) => roles.get(roleId) ?? []))];
      },
      setOwner(resourceId, subjectId) {
        if (!resourceId || !subjectId) return false;
        owners.set(resourceId, subjectId);
        return true;
      },
      ownerOf(resourceId) {
        return owners.get(resourceId) ?? null;
      },
      deny({ tenantId, businessId, subjectId, permission }) {
        denies.add(denyKey(tenantId, businessId, subjectId, permission));
      },
      isDenied({ tenantId, businessId, subjectId }, permission) {
        return denies.has(denyKey(tenantId, businessId, subjectId, permission));
      },
      listRoles() {
        return [...roles].map(([roleId, permissions]) => ({ roleId, permissions: [...permissions] }));
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/identity.js
  function normalizeIdentity(raw) {
    if (!raw || raw.authenticated !== true || typeof raw.subjectId !== "string") return null;
    const identity = {
      subjectId: raw.subjectId.trim(),
      subjectType: String(raw.subjectType ?? "user").toLowerCase(),
      tenantId: String(raw.tenantId ?? "").trim(),
      businessIds: Object.freeze([...raw.businessIds ?? []].map(String)),
      authenticatedAt: raw.authenticatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      assuranceLevel: raw.assuranceLevel ?? "standard"
    };
    if (identity.subjectId.length < 3 || identity.tenantId.length < 3 || !SUBJECT_TYPES.includes(identity.subjectType)) return null;
    return Object.freeze(identity);
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({
    ok: false,
    data: null,
    error: Object.freeze({ code, message, details }),
    meta: Object.freeze({ ...meta })
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/access-engine.js
  var localId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  function createAccessControlEngine(options = {}) {
    const resolveIdentity = options.resolveIdentity ?? (async () => null);
    const store = options.store ?? createAccessStore();
    const emit = options.emit ?? (async () => success());
    const createId = options.createId ?? localId;
    async function authorize(input = {}, context = {}) {
      const permission = String(input.permission ?? "");
      if (!PERMISSIONS.includes(permission)) return failure("ADI_ACCESS_PERMISSION_INVALID", "A supported permission is required.");
      const identity = normalizeIdentity(await resolveIdentity(context));
      const decisionId = input.resource?.decisionId ?? input.decisionId ?? null;
      const tenantId = input.resource?.tenantId ?? input.tenantId ?? null;
      const businessId = input.resource?.businessId ?? input.businessId ?? null;
      let allowed = false;
      let reason = "identity_unresolved";
      let roles = [];
      let permissions = [];
      if (identity) {
        if (!tenantId || !businessId || !decisionId) reason = "resource_invalid";
        else if (identity.tenantId !== tenantId) reason = "tenant_mismatch";
        else if (!identity.businessIds.includes(businessId)) reason = "business_mismatch";
        else if (store.isDenied({ tenantId, businessId, subjectId: identity.subjectId }, permission)) reason = "explicitly_denied";
        else {
          roles = store.rolesFor({ tenantId, businessId, subjectId: identity.subjectId });
          permissions = store.permissionsFor({ tenantId, businessId, subjectId: identity.subjectId });
          if (store.ownerOf(decisionId) === identity.subjectId && ["decision.view", "decision.update"].includes(permission)) {
            allowed = true;
            reason = "owner_allowed";
          } else if (permissions.includes(permission)) {
            allowed = true;
            reason = "allowed_by_role";
          } else reason = "permission_missing";
        }
      }
      const accessDecision = Object.freeze({
        accessDecisionId: createId("access"),
        allowed,
        reason,
        permission,
        subjectId: identity?.subjectId ?? null,
        subjectType: identity?.subjectType ?? null,
        tenantId,
        businessId,
        decisionId,
        roles: Object.freeze(roles),
        permissions: Object.freeze(permissions),
        evaluatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        traceId: context.traceId ?? input.traceId ?? null
      });
      await emit(`adi.access.${allowed ? "allowed" : "denied"}`, accessDecision, { tenantId, businessId, decisionId });
      return success(accessDecision);
    }
    async function secureDecisionCase(decisionCase, context = {}) {
      if (!decisionCase?.decisionId || !decisionCase?.tenantId || !decisionCase?.businessId) {
        return failure("ADI_DECISION_CASE_INVALID", "A canonical DecisionCase is required.");
      }
      const result = await authorize({ resource: decisionCase, permission: "decision.update", traceId: decisionCase.traceId }, context);
      if (!result.ok || !result.data.allowed) return failure("ADI_DECISION_CASE_ACCESS_DENIED", "DecisionCase access was denied.", result.data ?? result.error);
      if (!store.ownerOf(decisionCase.decisionId)) store.setOwner(decisionCase.decisionId, result.data.subjectId);
      const secured = Object.freeze({
        ...decisionCase,
        security: Object.freeze({
          ownerId: store.ownerOf(decisionCase.decisionId),
          accessDecisionId: result.data.accessDecisionId,
          tenantBoundary: decisionCase.tenantId,
          businessBoundary: decisionCase.businessId,
          securedAt: (/* @__PURE__ */ new Date()).toISOString(),
          securitySchemaVersion: "1.0.0",
          accessProof: Object.freeze({
            accessDecisionId: result.data.accessDecisionId,
            allowed: result.data.allowed,
            permission: result.data.permission,
            subjectId: result.data.subjectId,
            tenantId: result.data.tenantId,
            businessId: result.data.businessId,
            decisionId: result.data.decisionId,
            evaluatedAt: result.data.evaluatedAt,
            traceId: result.data.traceId
          })
        })
      });
      await emit("adi.decision_case.secured", { decisionId: secured.decisionId, security: secured.security }, {
        tenantId: secured.tenantId,
        businessId: secured.businessId,
        decisionId: secured.decisionId,
        traceId: secured.traceId
      });
      return success(secured);
    }
    return Object.freeze({ blockId: "ADI-03", version: "1.0.0", store, authorize, secureDecisionCase });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "emit", "createId", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const engine = createAccessControlEngine({ ...options, emit: runtime.emit, createId: runtime.createId });
    const service = runtime.registerService("adi.access_control", engine, { blockId: "ADI-03", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [
      ["adi.access.authorize", (request, context) => engine.authorize(request, context)],
      ["adi.decision_case.secure", (request, context) => engine.secureDecisionCase(request.decisionCase ?? request, context)]
    ];
    for (const [name, handler] of routes) {
      const result = runtime.registerRoute(name, handler, { blockId: "ADI-03" });
      if (!result.ok) return result;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-03", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-03", service: "adi.access_control", routes: routes.map(([name]) => name) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-03"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/adi-04-decision-context-acquisition-normalization-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    CONTEXT_SOURCE_TYPES: () => CONTEXT_SOURCE_TYPES,
    FRAGMENT_SCOPES: () => FRAGMENT_SCOPES,
    FRESHNESS_STATES: () => FRESHNESS_STATES,
    QUALITY_LEVELS: () => QUALITY_LEVELS,
    attachToADIRuntime: () => attachToADIRuntime,
    createDecisionContextEngine: () => createDecisionContextEngine,
    createProviderRegistry: () => createProviderRegistry,
    detectConflicts: () => detectConflicts,
    freshnessOf: () => freshnessOf,
    normalizeFragment: () => normalizeFragment,
    qualitySummary: () => qualitySummary
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/constants.js
  var CONTEXT_SOURCE_TYPES = Object.freeze([
    "business_intelligence",
    "business_digital_twin",
    "simulation_results",
    "business_operations",
    "goal_registry",
    "trigger_registry",
    "problem_registry",
    "manual_evidence",
    "external_verified"
  ]);
  var QUALITY_LEVELS = Object.freeze(["verified", "high", "medium", "low", "unknown"]);
  var FRESHNESS_STATES = Object.freeze(["current", "aging", "stale", "undated"]);
  var FRAGMENT_SCOPES = Object.freeze(["financial", "market", "customer", "operations", "risk", "legal", "goal", "trigger", "problem", "simulation", "general"]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/provider-registry.js
  function createProviderRegistry() {
    const providers = /* @__PURE__ */ new Map();
    return Object.freeze({
      register(descriptor, provider) {
        if (!descriptor?.providerId || !CONTEXT_SOURCE_TYPES.includes(descriptor.sourceType) || typeof provider?.acquire !== "function") return failure("ADI_CONTEXT_PROVIDER_INVALID", "Provider ID, supported source type and acquire function are required.");
        if (providers.has(descriptor.providerId)) return failure("ADI_CONTEXT_PROVIDER_DUPLICATE", `Provider already exists: ${descriptor.providerId}`);
        providers.set(descriptor.providerId, Object.freeze({ descriptor: Object.freeze({ ...descriptor }), provider, registeredAt: (/* @__PURE__ */ new Date()).toISOString() }));
        return success({ providerId: descriptor.providerId, sourceType: descriptor.sourceType });
      },
      get(id2) {
        const item = providers.get(id2);
        return item ? success(item) : failure("ADI_CONTEXT_PROVIDER_NOT_FOUND", `Provider was not found: ${id2}`);
      },
      list() {
        return success([...providers.values()].map((item) => ({ descriptor: { ...item.descriptor }, registeredAt: item.registeredAt })));
      },
      entries() {
        return [...providers.values()];
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/normalizer.js
  var id = (value) => typeof value === "string" ? value.trim() : "";
  function normalizeFragment(raw, providerDescriptor, boundary) {
    const sourceType = id(raw?.sourceType || providerDescriptor.sourceType);
    const quality = id(raw?.quality || "unknown").toLowerCase();
    const scope = id(raw?.scope || "general").toLowerCase();
    const observedAt = id(raw?.observedAt);
    const timestamp = Date.parse(observedAt);
    const errors = [];
    if (!CONTEXT_SOURCE_TYPES.includes(sourceType)) errors.push("unsupported_source_type");
    if (!QUALITY_LEVELS.includes(quality)) errors.push("invalid_quality");
    if (!FRAGMENT_SCOPES.includes(scope)) errors.push("invalid_scope");
    if (!raw?.recordId) errors.push("record_id_required");
    if (!raw?.schemaVersion) errors.push("schema_version_required");
    if (!raw || typeof raw.data !== "object" || Array.isArray(raw.data) || raw.data === null) errors.push("object_data_required");
    if (raw?.tenantId && raw.tenantId !== boundary.tenantId) errors.push("tenant_boundary_mismatch");
    if (raw?.businessId && raw.businessId !== boundary.businessId) errors.push("business_boundary_mismatch");
    return Object.freeze({
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      fragment: errors.length ? null : Object.freeze({
        fragmentId: id(raw.fragmentId) || `${providerDescriptor.providerId}:${raw.recordId}`,
        providerId: providerDescriptor.providerId,
        sourceType,
        scope,
        recordId: id(raw.recordId),
        tenantId: boundary.tenantId,
        businessId: boundary.businessId,
        data: Object.freeze({ ...raw.data }),
        units: Object.freeze({ ...raw.units }),
        currency: id(raw.currency) || null,
        quality,
        observedAt: Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString(),
        schemaVersion: id(raw.schemaVersion),
        provenance: Object.freeze({
          sourceSystem: id(raw.sourceSystem || providerDescriptor.providerId),
          sourceRecordId: id(raw.recordId),
          retrievedAt: (/* @__PURE__ */ new Date()).toISOString(),
          transformation: "structural_normalization_only"
        })
      })
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/assessment.js
  function freshnessOf(observedAt, now, maxAgeHours) {
    if (!observedAt) return "undated";
    const age = (now.getTime() - Date.parse(observedAt)) / 36e5;
    if (age <= maxAgeHours) return "current";
    if (age <= maxAgeHours * 2) return "aging";
    return "stale";
  }
  function scalarEntries(fragment) {
    return Object.entries(fragment.data).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value));
  }
  function detectConflicts(fragments) {
    const seen = /* @__PURE__ */ new Map(), conflicts = [];
    for (const fragment of fragments) {
      for (const [key, value] of scalarEntries(fragment)) {
        const compound = `${fragment.scope}.${key}`;
        const prior = seen.get(compound);
        if (prior && prior.value !== value) conflicts.push(Object.freeze({ field: compound, left: Object.freeze({ fragmentId: prior.fragmentId, value: prior.value }), right: Object.freeze({ fragmentId: fragment.fragmentId, value }) }));
        else if (!prior) seen.set(compound, { fragmentId: fragment.fragmentId, value });
      }
    }
    return Object.freeze(conflicts);
  }
  function qualitySummary(fragments, failures) {
    const weights = { verified: 1, high: 0.85, medium: 0.65, low: 0.35, unknown: 0.15 };
    const score = fragments.length ? Math.round(fragments.reduce((sum, item) => sum + weights[item.quality], 0) / fragments.length * 100) : 0;
    return Object.freeze({ score, fragmentCount: fragments.length, providerFailureCount: failures.length, usable: fragments.length > 0 && score >= 35 });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/context-engine.js
  var localId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  function createDecisionContextEngine(options = {}) {
    const providers = options.providers ?? createProviderRegistry();
    const emit = options.emit ?? (async () => success());
    const createId = options.createId ?? localId;
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    const maxAgeHours = options.maxAgeHours ?? 168;
    function verifyBoundary(decisionCase, accessDecision) {
      if (!decisionCase?.security?.accessDecisionId) return failure("ADI_CONTEXT_CASE_UNSECURED", "ADI-03 secured DecisionCase is required.");
      if (!accessDecision?.allowed || accessDecision.accessDecisionId !== decisionCase.security.accessDecisionId) return failure("ADI_CONTEXT_ACCESS_INVALID", "Matching allowed AccessDecision is required.");
      if (accessDecision.tenantId !== decisionCase.tenantId || accessDecision.businessId !== decisionCase.businessId || accessDecision.decisionId !== decisionCase.decisionId) return failure("ADI_CONTEXT_BOUNDARY_MISMATCH", "Access and decision boundaries do not match.");
      return success({ tenantId: decisionCase.tenantId, businessId: decisionCase.businessId, decisionId: decisionCase.decisionId });
    }
    async function acquire(input = {}, context = {}) {
      const decisionCase = input.decisionCase;
      const accessDecision = input.accessDecision ?? decisionCase?.security?.accessProof;
      const boundaryResult = verifyBoundary(decisionCase, accessDecision);
      if (!boundaryResult.ok) return boundaryResult;
      const boundary = boundaryResult.data;
      const selected = new Set(input.providerIds ?? []);
      const entries = providers.entries().filter((item) => !selected.size || selected.has(item.descriptor.providerId));
      if (!entries.length) return failure("ADI_CONTEXT_PROVIDER_REQUIRED", "At least one registered context provider is required.");
      const fragments = [], failures = [], invalid = [];
      for (const item of entries) {
        try {
          const response = await item.provider.acquire({ decisionCase, boundary, requestedScopes: input.requestedScopes ?? [] }, context);
          const records = Array.isArray(response) ? response : Array.isArray(response?.fragments) ? response.fragments : [];
          if (!records.length) {
            failures.push(Object.freeze({ providerId: item.descriptor.providerId, code: "NO_CONTEXT_RETURNED" }));
            continue;
          }
          for (const raw of records) {
            const normalized = normalizeFragment(raw, item.descriptor, boundary);
            if (normalized.valid) fragments.push(normalized.fragment);
            else invalid.push(Object.freeze({ providerId: item.descriptor.providerId, recordId: raw?.recordId ?? null, errors: normalized.errors }));
          }
        } catch (error) {
          failures.push(Object.freeze({ providerId: item.descriptor.providerId, code: "PROVIDER_FAILED", message: error.message }));
        }
      }
      const acquiredAt = now().toISOString();
      const enriched = fragments.map((fragment) => Object.freeze({ ...fragment, freshness: freshnessOf(fragment.observedAt, now(), maxAgeHours) }));
      const requestedTypes = new Set(input.requiredSourceTypes ?? []);
      const presentTypes = new Set(enriched.map((item) => item.sourceType));
      const missingSourceTypes = [...requestedTypes].filter((type) => !presentTypes.has(type));
      const envelope = Object.freeze({
        contextId: createId("context"),
        decisionId: boundary.decisionId,
        tenantId: boundary.tenantId,
        businessId: boundary.businessId,
        accessDecisionId: accessDecision.accessDecisionId,
        fragments: Object.freeze(enriched),
        conflicts: detectConflicts(enriched),
        providerFailures: Object.freeze(failures),
        invalidFragments: Object.freeze(invalid),
        missingSourceTypes: Object.freeze(missingSourceTypes),
        quality: qualitySummary(enriched, failures),
        acquiredAt,
        schemaVersion: "1.0.0",
        normalizationPolicy: "preserve_values_and_provenance"
      });
      await emit("adi.decision_context.acquired", { contextId: envelope.contextId, decisionId: envelope.decisionId, quality: envelope.quality, fragmentCount: envelope.fragments.length }, { ...boundary, traceId: decisionCase.traceId });
      return success(envelope, { partial: failures.length > 0 || invalid.length > 0 || missingSourceTypes.length > 0 });
    }
    return Object.freeze({ blockId: "ADI-04", version: "1.0.0", providers, verifyBoundary, acquire });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "emit", "createId", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const engine = createDecisionContextEngine({ ...options, emit: runtime.emit, createId: runtime.createId });
    const service = runtime.registerService("adi.decision_context", engine, { blockId: "ADI-04", version: "1.0.0" });
    if (!service.ok) return service;
    const route = runtime.registerRoute("adi.decision_context.acquire", (request, context) => engine.acquire(request, context), { blockId: "ADI-04" });
    if (!route.ok) return route;
    void runtime.emit("adi.block.ready", { blockId: "ADI-04", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-04", service: "adi.decision_context", route: "adi.decision_context.acquire" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-04"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/adi-05-business-digital-twin-context-adapter.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createDigitalTwinContextAdapter: () => createDigitalTwinContextAdapter,
    mapSnapshotToFragments: () => mapSnapshotToFragments,
    validateTwinSnapshot: () => validateTwinSnapshot
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/snapshot-validator.js
  var id = (value) => typeof value === "string" ? value.trim() : "";
  function validateTwinSnapshot(snapshot, boundary) {
    const errors = [], warnings = [];
    if (!snapshot || typeof snapshot !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["snapshot_required"]), warnings: Object.freeze([]) });
    if (!id(snapshot.snapshotId)) errors.push("snapshot_id_required");
    if (!id(snapshot.twinId)) errors.push("twin_id_required");
    if (!id(snapshot.version)) errors.push("version_required");
    if (snapshot.tenantId !== boundary.tenantId) errors.push("tenant_boundary_mismatch");
    if (snapshot.businessId !== boundary.businessId) errors.push("business_boundary_mismatch");
    if (snapshot.publicationStatus !== "published") errors.push("snapshot_not_published");
    if (Number.isNaN(Date.parse(snapshot.publishedAt))) errors.push("published_at_invalid");
    if (!id(snapshot.schemaVersion)) errors.push("schema_version_required");
    if (!snapshot.state || typeof snapshot.state !== "object" || Array.isArray(snapshot.state)) errors.push("state_object_required");
    if (!Array.isArray(snapshot.entities)) warnings.push("entities_missing");
    if (!Array.isArray(snapshot.relationships)) warnings.push("relationships_missing");
    if (!Array.isArray(snapshot.assumptions)) warnings.push("assumptions_missing");
    if (!snapshot.quality) warnings.push("quality_unreported");
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/fragment-mapper.js
  var clone = (value) => value === void 0 ? void 0 : structuredClone(value);
  function mapSnapshotToFragments(snapshot, validation) {
    const common = {
      tenantId: snapshot.tenantId,
      businessId: snapshot.businessId,
      sourceType: "business_digital_twin",
      quality: snapshot.quality ?? "unknown",
      observedAt: snapshot.publishedAt,
      schemaVersion: snapshot.schemaVersion,
      sourceSystem: snapshot.sourceSystem ?? "infinicus_business_digital_twin"
    };
    const fragments = [{
      ...common,
      fragmentId: `twin:${snapshot.snapshotId}:state`,
      recordId: snapshot.snapshotId,
      scope: "general",
      data: { twinId: snapshot.twinId, twinVersion: snapshot.version, publicationStatus: snapshot.publicationStatus, state: clone(snapshot.state) },
      units: clone(snapshot.units ?? {})
    }];
    if (Array.isArray(snapshot.entities) && snapshot.entities.length) fragments.push({ ...common, fragmentId: `twin:${snapshot.snapshotId}:entities`, recordId: `${snapshot.snapshotId}:entities`, scope: "operations", data: { entities: clone(snapshot.entities) }, units: {} });
    if (Array.isArray(snapshot.relationships) && snapshot.relationships.length) fragments.push({ ...common, fragmentId: `twin:${snapshot.snapshotId}:relationships`, recordId: `${snapshot.snapshotId}:relationships`, scope: "operations", data: { relationships: clone(snapshot.relationships) }, units: {} });
    if (Array.isArray(snapshot.assumptions) && snapshot.assumptions.length) fragments.push({ ...common, fragmentId: `twin:${snapshot.snapshotId}:assumptions`, recordId: `${snapshot.snapshotId}:assumptions`, scope: "general", data: { assumptions: clone(snapshot.assumptions), validationWarnings: [...validation.warnings] }, units: {} });
    return Object.freeze(fragments.map(Object.freeze));
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/twin-adapter.js
  function createDigitalTwinContextAdapter(options = {}) {
    const readSnapshot = options.readSnapshot;
    const emit = options.emit ?? (async () => success());
    async function acquire({ decisionCase, boundary, requestedScopes = [] } = {}, context = {}) {
      if (typeof readSnapshot !== "function") return failure("ADI_TWIN_READER_REQUIRED", "A read-only Digital Twin snapshot reader is required.");
      if (!decisionCase?.decisionId || !boundary?.tenantId || !boundary?.businessId) return failure("ADI_TWIN_QUERY_INVALID", "Decision and business boundaries are required.");
      let snapshot;
      try {
        snapshot = await readSnapshot(Object.freeze({ tenantId: boundary.tenantId, businessId: boundary.businessId, decisionId: decisionCase.decisionId, requestedScopes: Object.freeze([...requestedScopes]) }), context);
      } catch (error) {
        return failure("ADI_TWIN_READ_FAILED", "Digital Twin snapshot retrieval failed.", { message: error.message });
      }
      const validation = validateTwinSnapshot(snapshot, boundary);
      if (!validation.valid) {
        await emit("adi.digital_twin_context.rejected", { decisionId: decisionCase.decisionId, errors: validation.errors }, { ...boundary, traceId: decisionCase.traceId });
        return failure("ADI_TWIN_SNAPSHOT_INVALID", "Digital Twin snapshot failed validation.", { errors: validation.errors, warnings: validation.warnings });
      }
      const fragments = mapSnapshotToFragments(snapshot, validation);
      await emit("adi.digital_twin_context.acquired", { decisionId: decisionCase.decisionId, snapshotId: snapshot.snapshotId, twinVersion: snapshot.version, fragmentCount: fragments.length }, { ...boundary, traceId: decisionCase.traceId });
      return success(Object.freeze({ fragments, snapshot: Object.freeze({ snapshotId: snapshot.snapshotId, twinId: snapshot.twinId, version: snapshot.version, publishedAt: snapshot.publishedAt }), warnings: validation.warnings }));
    }
    return Object.freeze({ blockId: "ADI-05", version: "1.0.0", mode: "read_only", acquire });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "getService", "emit", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const contextService = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!contextService.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-05.");
    const adapter = createDigitalTwinContextAdapter({ ...options, emit: runtime.emit });
    const service = runtime.registerService("adi.digital_twin_context_adapter", adapter, { blockId: "ADI-05", version: "1.0.0", mode: "read_only" });
    if (!service.ok) return service;
    const route = runtime.registerRoute("adi.digital_twin_context.acquire", (request, context) => adapter.acquire(request, context), { blockId: "ADI-05" });
    if (!route.ok) return route;
    const provider = contextService.data.providers.register({ providerId: "adi05.business_digital_twin", sourceType: "business_digital_twin", blockId: "ADI-05" }, { acquire: async (query, context) => {
      const result = await adapter.acquire(query, context);
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      return result.data.fragments;
    } });
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-05", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-05", service: "adi.digital_twin_context_adapter", route: "adi.digital_twin_context.acquire", providerId: "adi05.business_digital_twin" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-05"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-06-Simulation-Engine-Results-Adapter ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/adi-06-simulation-engine-results-adapter.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createSimulationResultsAdapter: () => createSimulationResultsAdapter,
    mapRunToFragments: () => mapRunToFragments,
    validateSimulationRun: () => validateSimulationRun
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/run-validator.js
  var text = (value) => typeof value === "string" ? value.trim() : "";
  function validateSimulationRun(run, boundary, decisionId) {
    const errors = [], warnings = [];
    if (!run || typeof run !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["run_required"]), warnings: Object.freeze([]) });
    for (const field of ["runId", "engineVersion", "modelVersion", "schemaVersion"]) {
      if (!text(run[field])) errors.push(`${field}_required`);
    }
    if (run.tenantId !== boundary.tenantId) errors.push("tenant_boundary_mismatch");
    if (run.businessId !== boundary.businessId) errors.push("business_boundary_mismatch");
    if (run.decisionId && run.decisionId !== decisionId) errors.push("decision_boundary_mismatch");
    if (run.status !== "completed") errors.push("run_not_completed");
    if (Number.isNaN(Date.parse(run.completedAt))) errors.push("completed_at_invalid");
    if (!Number.isInteger(run.sampleSize) || run.sampleSize < 1) errors.push("sample_size_invalid");
    if (!Array.isArray(run.scenarios) || run.scenarios.length < 1) errors.push("scenarios_required");
    if (!run.outputs || typeof run.outputs !== "object" || Array.isArray(run.outputs)) errors.push("outputs_object_required");
    if (!Array.isArray(run.assumptions)) warnings.push("assumptions_missing");
    if (!run.randomSeed) warnings.push("random_seed_unrecorded");
    if (!run.inputFingerprint) warnings.push("input_fingerprint_missing");
    if (!run.quality) warnings.push("quality_unreported");
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/fragment-mapper.js
  var clone = (value) => value === void 0 ? void 0 : structuredClone(value);
  function mapRunToFragments(run, validation) {
    const common = { tenantId: run.tenantId, businessId: run.businessId, sourceType: "simulation_results", scope: "simulation", quality: run.quality ?? "unknown", observedAt: run.completedAt, schemaVersion: run.schemaVersion, sourceSystem: run.sourceSystem ?? "infinicus_simulation_engine" };
    const metadata = { runId: run.runId, engineVersion: run.engineVersion, modelVersion: run.modelVersion, sampleSize: run.sampleSize, randomSeed: run.randomSeed ?? null, inputFingerprint: run.inputFingerprint ?? null, status: run.status };
    return Object.freeze([
      Object.freeze({ ...common, fragmentId: `simulation:${run.runId}:outputs`, recordId: run.runId, data: { metadata, outputs: clone(run.outputs), verdict: clone(run.verdict ?? null) }, units: clone(run.units ?? {}), currency: run.currency ?? null }),
      Object.freeze({ ...common, fragmentId: `simulation:${run.runId}:scenarios`, recordId: `${run.runId}:scenarios`, data: { scenarios: clone(run.scenarios) }, units: {} }),
      Object.freeze({ ...common, fragmentId: `simulation:${run.runId}:assumptions`, recordId: `${run.runId}:assumptions`, data: { assumptions: clone(run.assumptions ?? []), validationWarnings: [...validation.warnings] }, units: {} })
    ]);
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/simulation-adapter.js
  function createSimulationResultsAdapter(options = {}) {
    const readCompletedRun = options.readCompletedRun;
    const emit = options.emit ?? (async () => success());
    async function acquire({ decisionCase, boundary, requestedScopes = [], runIds = [] } = {}, context = {}) {
      if (typeof readCompletedRun !== "function") return failure("ADI_SIMULATION_READER_REQUIRED", "A read-only completed simulation run reader is required.");
      if (!decisionCase?.decisionId || !boundary?.tenantId || !boundary?.businessId) return failure("ADI_SIMULATION_QUERY_INVALID", "Decision and business boundaries are required.");
      let result;
      try {
        result = await readCompletedRun(Object.freeze({ tenantId: boundary.tenantId, businessId: boundary.businessId, decisionId: decisionCase.decisionId, runIds: Object.freeze([...runIds]), requestedScopes: Object.freeze([...requestedScopes]) }), context);
      } catch (error) {
        return failure("ADI_SIMULATION_READ_FAILED", "Completed simulation result retrieval failed.", { message: error.message });
      }
      const runs = Array.isArray(result) ? result : [result];
      const fragments = [], acceptedRuns = [], rejectedRuns = [];
      for (const run of runs) {
        const validation = validateSimulationRun(run, boundary, decisionCase.decisionId);
        if (!validation.valid) {
          rejectedRuns.push(Object.freeze({ runId: run?.runId ?? null, errors: validation.errors, warnings: validation.warnings }));
          continue;
        }
        fragments.push(...mapRunToFragments(run, validation));
        acceptedRuns.push(Object.freeze({ runId: run.runId, engineVersion: run.engineVersion, modelVersion: run.modelVersion, completedAt: run.completedAt, warnings: validation.warnings }));
      }
      if (!acceptedRuns.length) {
        await emit("adi.simulation_results.rejected", { decisionId: decisionCase.decisionId, rejectedRuns }, { ...boundary, traceId: decisionCase.traceId });
        return failure("ADI_SIMULATION_RUN_INVALID", "No completed simulation run passed validation.", { rejectedRuns });
      }
      await emit("adi.simulation_results.acquired", { decisionId: decisionCase.decisionId, acceptedRunCount: acceptedRuns.length, rejectedRunCount: rejectedRuns.length, fragmentCount: fragments.length }, { ...boundary, traceId: decisionCase.traceId });
      return success(Object.freeze({ fragments: Object.freeze(fragments), acceptedRuns: Object.freeze(acceptedRuns), rejectedRuns: Object.freeze(rejectedRuns) }), { partial: rejectedRuns.length > 0 });
    }
    return Object.freeze({ blockId: "ADI-06", version: "1.0.0", mode: "read_only", acquire });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "getService", "emit", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const contextService = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!contextService.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-06.");
    const adapter = createSimulationResultsAdapter({ ...options, emit: runtime.emit });
    const service = runtime.registerService("adi.simulation_results_adapter", adapter, { blockId: "ADI-06", version: "1.0.0", mode: "read_only" });
    if (!service.ok) return service;
    const route = runtime.registerRoute("adi.simulation_results.acquire", (request, context) => adapter.acquire(request, context), { blockId: "ADI-06" });
    if (!route.ok) return route;
    const provider = contextService.data.providers.register({ providerId: "adi06.simulation_results", sourceType: "simulation_results", blockId: "ADI-06" }, { acquire: async (query, context) => {
      const result = await adapter.acquire(query, context);
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      return result.data.fragments;
    } });
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-06", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-06", service: "adi.simulation_results_adapter", route: "adi.simulation_results.acquire", providerId: "adi06.simulation_results" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-06"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/adi-07-decision-evidence-provenance-registry.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    canonicalize: () => canonicalize,
    createEvidenceRegistry: () => createEvidenceRegistry,
    createEvidenceRepository: () => createEvidenceRepository,
    sha256: () => sha256
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/canonical-hash.js
  function canonical(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  function canonicalize(value) {
    return canonical(value);
  }
  async function sha256(value) {
    if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
    const bytes = new TextEncoder().encode(canonical(value));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/repository.js
  function createEvidenceRepository() {
    const records = /* @__PURE__ */ new Map(), byDecision = /* @__PURE__ */ new Map(), lifecycle = [];
    return Object.freeze({
      append(record) {
        if (records.has(record.evidenceId)) return false;
        records.set(record.evidenceId, record);
        const key = `${record.tenantId}::${record.businessId}::${record.decisionId}`;
        const ids = byDecision.get(key) ?? [];
        ids.push(record.evidenceId);
        byDecision.set(key, ids);
        return true;
      },
      get(evidenceId) {
        return records.get(evidenceId) ?? null;
      },
      list({ tenantId, businessId, decisionId }) {
        const ids = byDecision.get(`${tenantId}::${businessId}::${decisionId}`) ?? [];
        return ids.map((id) => records.get(id));
      },
      appendLifecycle(entry) {
        lifecycle.push(entry);
      },
      lifecycleFor(evidenceId) {
        return lifecycle.filter((item) => item.evidenceId === evidenceId);
      },
      findByHash({ tenantId, businessId, decisionId, contentHash }) {
        return this.list({ tenantId, businessId, decisionId }).find((item) => item.contentHash === contentHash) ?? null;
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/evidence-registry.js
  var localId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var freeze = (value) => Object.freeze(structuredClone(value));
  function createEvidenceRegistry(options = {}) {
    const repository = options.repository ?? createEvidenceRepository();
    const createId = options.createId ?? localId;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    async function register(input = {}) {
      const required = ["tenantId", "businessId", "decisionId", "accessDecisionId", "sourceType", "sourceRecordId", "schemaVersion"];
      const missing = required.filter((field) => typeof input[field] !== "string" || !input[field].trim());
      if (missing.length || input.content === void 0) return failure("ADI_EVIDENCE_INVALID", "Evidence identity, source, schema and content are required.", { missing: [...missing, ...input.content === void 0 ? ["content"] : []] });
      let contentHash;
      try {
        contentHash = await sha256(input.content);
      } catch (error) {
        return failure("ADI_EVIDENCE_HASH_FAILED", "Evidence content could not be hashed.", { message: error.message });
      }
      const duplicate = repository.findByHash({ ...input, contentHash });
      if (duplicate) return success(duplicate, { duplicate: true });
      const evidence = Object.freeze({
        evidenceId: input.evidenceId || createId("evidence"),
        tenantId: input.tenantId,
        businessId: input.businessId,
        decisionId: input.decisionId,
        accessDecisionId: input.accessDecisionId,
        contextId: input.contextId ?? null,
        fragmentId: input.fragmentId ?? null,
        sourceType: input.sourceType,
        providerId: input.providerId ?? null,
        sourceSystem: input.sourceSystem ?? null,
        sourceRecordId: input.sourceRecordId,
        schemaVersion: input.schemaVersion,
        content: freeze(input.content),
        contentHash,
        hashAlgorithm: "SHA-256",
        quality: input.quality ?? "unknown",
        freshness: input.freshness ?? "undated",
        observedAt: input.observedAt ?? null,
        retrievedAt: input.retrievedAt ?? now().toISOString(),
        registeredAt: now().toISOString(),
        parentEvidenceIds: Object.freeze([...input.parentEvidenceIds ?? []]),
        status: "active",
        provenanceVersion: "1.0.0"
      });
      if (!repository.append(evidence)) return failure("ADI_EVIDENCE_DUPLICATE_ID", "Evidence ID already exists.");
      await emit("adi.evidence.registered", { evidenceId: evidence.evidenceId, decisionId: evidence.decisionId, contentHash }, { tenantId: evidence.tenantId, businessId: evidence.businessId, decisionId: evidence.decisionId });
      return success(evidence);
    }
    async function ingestContext(contextEnvelope) {
      if (!contextEnvelope?.contextId || !contextEnvelope?.accessDecisionId || !Array.isArray(contextEnvelope.fragments)) return failure("ADI_CONTEXT_ENVELOPE_INVALID", "A canonical authorized ADI-04 DecisionContextEnvelope is required.");
      const registered = [], failed = [];
      for (const fragment of contextEnvelope.fragments) {
        const result = await register({ tenantId: contextEnvelope.tenantId, businessId: contextEnvelope.businessId, decisionId: contextEnvelope.decisionId, accessDecisionId: contextEnvelope.accessDecisionId, contextId: contextEnvelope.contextId, fragmentId: fragment.fragmentId, sourceType: fragment.sourceType, providerId: fragment.providerId, sourceSystem: fragment.provenance?.sourceSystem, sourceRecordId: fragment.recordId, schemaVersion: fragment.schemaVersion, content: { data: fragment.data, units: fragment.units, currency: fragment.currency }, quality: fragment.quality, freshness: fragment.freshness, observedAt: fragment.observedAt, retrievedAt: fragment.provenance?.retrievedAt });
        if (result.ok) registered.push(result.data);
        else failed.push({ fragmentId: fragment.fragmentId, error: result.error });
      }
      return success(Object.freeze({ contextId: contextEnvelope.contextId, registered: Object.freeze(registered), failed: Object.freeze(failed) }), { partial: failed.length > 0 });
    }
    function get({ evidenceId, tenantId, businessId, decisionId }) {
      const record = repository.get(evidenceId);
      if (!record) return failure("ADI_EVIDENCE_NOT_FOUND", "Evidence record was not found.");
      if (record.tenantId !== tenantId || record.businessId !== businessId || record.decisionId !== decisionId) return failure("ADI_EVIDENCE_BOUNDARY_MISMATCH", "Evidence boundary does not match.");
      return success(record);
    }
    function list(boundary) {
      return success(repository.list(boundary));
    }
    async function lifecycle(action, { evidenceId, tenantId, businessId, decisionId, replacementEvidenceId = null, reason }) {
      const found = get({ evidenceId, tenantId, businessId, decisionId });
      if (!found.ok) return found;
      if (!["superseded", "revoked"].includes(action) || !reason) return failure("ADI_EVIDENCE_LIFECYCLE_INVALID", "Supported action and reason are required.");
      if (action === "superseded" && !replacementEvidenceId) return failure("ADI_EVIDENCE_REPLACEMENT_REQUIRED", "Replacement evidence ID is required.");
      const entry = Object.freeze({ lifecycleId: createId("evidence_event"), evidenceId, action, replacementEvidenceId, reason, recordedAt: now().toISOString() });
      repository.appendLifecycle(entry);
      await emit(`adi.evidence.${action}`, entry, { tenantId, businessId, decisionId });
      return success(entry);
    }
    async function verify({ evidenceId, tenantId, businessId, decisionId }) {
      const found = get({ evidenceId, tenantId, businessId, decisionId });
      if (!found.ok) return found;
      const actual = await sha256(found.data.content);
      return success(Object.freeze({ evidenceId, valid: actual === found.data.contentHash, expectedHash: found.data.contentHash, actualHash: actual, verifiedAt: now().toISOString() }));
    }
    return Object.freeze({ blockId: "ADI-07", version: "1.0.0", register, ingestContext, get, list, verify, supersede: (input) => lifecycle("superseded", input), revoke: (input) => lifecycle("revoked", input), lifecycleFor: (evidenceId) => success(repository.lifecycleFor(evidenceId)) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "emit", "createId", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const registry = createEvidenceRegistry({ ...options, emit: runtime.emit, createId: runtime.createId });
    const service = runtime.registerService("adi.evidence_registry", registry, { blockId: "ADI-07", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.evidence.register", (request) => registry.register(request)], ["adi.evidence.context.ingest", (request) => registry.ingestContext(request.contextEnvelope ?? request)], ["adi.evidence.get", (request) => registry.get(request)], ["adi.evidence.list", (request) => registry.list(request)], ["adi.evidence.verify", (request) => registry.verify(request)], ["adi.evidence.supersede", (request) => registry.supersede(request)], ["adi.evidence.revoke", (request) => registry.revoke(request)]];
    for (const [name, handler] of routes) {
      const result = runtime.registerRoute(name, handler, { blockId: "ADI-07" });
      if (!result.ok) return result;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-07", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-07", service: "adi.evidence_registry", routes: routes.map(([name]) => name) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-07"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-08-Business-Goal-Registry ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-08-Business-Goal-Registry/src/adi-08-business-goal-registry.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/index.js
  var src_exports = {};
  __export(src_exports, {
    GOAL_DIRECTIONS: () => GOAL_DIRECTIONS,
    GOAL_PRIORITIES: () => GOAL_PRIORITIES,
    GOAL_STATUSES: () => GOAL_STATUSES,
    GOAL_TYPES: () => GOAL_TYPES,
    attachToADIRuntime: () => attachToADIRuntime,
    calculateProgress: () => calculateProgress,
    createGoalContextProvider: () => createGoalContextProvider,
    createGoalRegistry: () => createGoalRegistry,
    createGoalRepository: () => createGoalRepository,
    inferDirection: () => inferDirection
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/constants.js
  var GOAL_TYPES = Object.freeze(["growth", "financial", "customer", "market", "operations", "risk", "compliance", "impact", "custom"]);
  var GOAL_PRIORITIES = Object.freeze(["low", "medium", "high", "critical"]);
  var GOAL_STATUSES = Object.freeze(["draft", "active", "paused", "achieved", "cancelled", "archived"]);
  var GOAL_DIRECTIONS = Object.freeze(["increase", "decrease", "maintain"]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/progress.js
  function inferDirection(baseline, target) {
    return target > baseline ? "increase" : target < baseline ? "decrease" : "maintain";
  }
  function calculateProgress({ baselineValue, currentValue, targetValue, direction = inferDirection(baselineValue, targetValue), tolerance = 0 }) {
    let raw = 0;
    if (direction === "increase") {
      const range = targetValue - baselineValue;
      raw = range <= 0 ? 0 : (currentValue - baselineValue) / range * 100;
    } else if (direction === "decrease") {
      const range = baselineValue - targetValue;
      raw = range <= 0 ? 0 : (baselineValue - currentValue) / range * 100;
    } else raw = Math.abs(currentValue - targetValue) <= Math.abs(tolerance) ? 100 : 0;
    return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/repository.js
  function createGoalRepository() {
    const histories = /* @__PURE__ */ new Map(), idempotency = /* @__PURE__ */ new Map();
    const boundary = (tenantId, businessId) => `${tenantId}::${businessId}`;
    return Object.freeze({
      create(goal) {
        if (histories.has(goal.goalId)) return false;
        histories.set(goal.goalId, [goal]);
        return true;
      },
      append(goal) {
        const history = histories.get(goal.goalId);
        if (!history || goal.version !== history.at(-1).version + 1) return false;
        history.push(goal);
        return true;
      },
      get({ goalId, tenantId, businessId, version }) {
        const history = histories.get(goalId);
        if (!history) return null;
        const record = version ? history.find((item) => item.version === version) : history.at(-1);
        return record?.tenantId === tenantId && record?.businessId === businessId ? record : null;
      },
      history({ goalId, tenantId, businessId }) {
        return (histories.get(goalId) ?? []).filter((item) => item.tenantId === tenantId && item.businessId === businessId);
      },
      list({ tenantId, businessId, status }) {
        return [...histories.values()].map((history) => history.at(-1)).filter((item) => item.tenantId === tenantId && item.businessId === businessId && (!status || item.status === status));
      },
      idempotentGet({ tenantId, businessId, key }) {
        return idempotency.get(`${boundary(tenantId, businessId)}::${key}`) ?? null;
      },
      idempotentSet({ tenantId, businessId, key, goalId }) {
        if (key) idempotency.set(`${boundary(tenantId, businessId)}::${key}`, goalId);
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/goal-registry.js
  var localId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var clean = (value) => typeof value === "string" ? value.trim() : "";
  function validate(input, isUpdate = false) {
    const errors = [];
    if (!clean(input.tenantId)) errors.push("tenant_id_required");
    if (!clean(input.businessId)) errors.push("business_id_required");
    if (!isUpdate && clean(input.title).length < 3) errors.push("title_required");
    for (const field of ["baselineValue", "currentValue", "targetValue"]) {
      if (!isUpdate && !Number.isFinite(Number(input[field]))) errors.push(`${field}_invalid`);
      if (isUpdate && input[field] !== void 0 && !Number.isFinite(Number(input[field]))) errors.push(`${field}_invalid`);
    }
    if (!isUpdate && !clean(input.unit)) errors.push("unit_required");
    if (input.type && !GOAL_TYPES.includes(input.type)) errors.push("type_invalid");
    if (input.priority && !GOAL_PRIORITIES.includes(input.priority)) errors.push("priority_invalid");
    if (input.status && !GOAL_STATUSES.includes(input.status)) errors.push("status_invalid");
    if (input.direction && !GOAL_DIRECTIONS.includes(input.direction)) errors.push("direction_invalid");
    if (input.targetDate && Number.isNaN(Date.parse(input.targetDate))) errors.push("target_date_invalid");
    return errors;
  }
  function createGoalRegistry(options = {}) {
    const repository = options.repository ?? createGoalRepository();
    const createId = options.createId ?? localId;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    async function create(input = {}) {
      const errors = validate(input);
      if (errors.length) return failure("ADI_GOAL_INVALID", "Goal failed validation.", { errors });
      if (input.idempotencyKey) {
        const existingId = repository.idempotentGet({ tenantId: input.tenantId, businessId: input.businessId, key: input.idempotencyKey });
        if (existingId) return get({ goalId: existingId, tenantId: input.tenantId, businessId: input.businessId });
      }
      const baseline = Number(input.baselineValue), current = Number(input.currentValue), target = Number(input.targetValue), direction = input.direction ?? inferDirection(baseline, target), createdAt = now().toISOString();
      const goal = Object.freeze({ goalId: input.goalId ?? createId("goal"), tenantId: input.tenantId, businessId: input.businessId, type: input.type ?? "growth", title: clean(input.title), description: clean(input.description), baselineValue: baseline, currentValue: current, targetValue: target, unit: clean(input.unit), direction, tolerance: Number(input.tolerance ?? 0), priority: input.priority ?? "medium", status: input.status ?? "active", progressPercent: calculateProgress({ baselineValue: baseline, currentValue: current, targetValue: target, direction, tolerance: Number(input.tolerance ?? 0) }), targetDate: input.targetDate ?? null, ownerId: input.ownerId ?? null, version: 1, createdAt, updatedAt: createdAt, schemaVersion: "1.0.0" });
      if (!repository.create(goal)) return failure("ADI_GOAL_DUPLICATE_ID", "Goal ID already exists.");
      repository.idempotentSet({ tenantId: goal.tenantId, businessId: goal.businessId, key: input.idempotencyKey, goalId: goal.goalId });
      await emit("adi.goal.created", goal, { tenantId: goal.tenantId, businessId: goal.businessId });
      return success(goal);
    }
    function get(query) {
      const goal = repository.get(query);
      return goal ? success(goal) : failure("ADI_GOAL_NOT_FOUND", "Goal was not found inside the requested boundary.");
    }
    function list(query) {
      return success(repository.list(query));
    }
    function history(query) {
      return success(repository.history(query));
    }
    async function update(input = {}) {
      if (!input.goalId) return failure("ADI_GOAL_ID_REQUIRED", "Goal ID is required.");
      const current = get(input);
      if (!current.ok) return current;
      const errors = validate({ ...input, tenantId: current.data.tenantId, businessId: current.data.businessId }, true);
      if (errors.length) return failure("ADI_GOAL_INVALID", "Goal update failed validation.", { errors });
      const allowed = ["type", "title", "description", "currentValue", "targetValue", "unit", "direction", "tolerance", "priority", "status", "targetDate", "ownerId"];
      const values = { ...current.data };
      for (const field of allowed) {
        if (input[field] !== void 0) values[field] = ["baselineValue", "currentValue", "targetValue", "tolerance"].includes(field) ? Number(input[field]) : input[field];
      }
      values.direction = input.direction ?? inferDirection(values.baselineValue, values.targetValue);
      values.progressPercent = calculateProgress(values);
      values.version = current.data.version + 1;
      values.updatedAt = now().toISOString();
      const next = Object.freeze(values);
      if (!repository.append(next)) return failure("ADI_GOAL_VERSION_CONFLICT", "Goal version could not be appended.");
      await emit("adi.goal.updated", { goalId: next.goalId, version: next.version, status: next.status, progressPercent: next.progressPercent }, { tenantId: next.tenantId, businessId: next.businessId });
      return success(next);
    }
    async function setStatus(input) {
      return update({ ...input, status: input.status });
    }
    async function importLegacy(input = {}) {
      return create({ ...input, tenantId: input.tenantId, type: input.type ?? "growth", direction: input.direction ?? inferDirection(Number(input.baselineValue ?? 0), Number(input.targetValue ?? 0)), schemaVersion: void 0 });
    }
    function exportLegacy(query) {
      const found = get(query);
      if (!found.ok) return found;
      const goal = found.data;
      return success({ goalId: goal.goalId, businessId: goal.businessId, type: goal.type, title: goal.title, description: goal.description, baselineValue: goal.baselineValue, currentValue: goal.currentValue, targetValue: goal.targetValue, unit: goal.unit, priority: goal.priority, status: goal.status, progressPercent: goal.progressPercent, version: goal.version });
    }
    return Object.freeze({ blockId: "ADI-08", version: "1.0.0", create, get, list, history, update, setStatus, importLegacy, exportLegacy });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/context-provider.js
  function createGoalContextProvider(registry) {
    return Object.freeze({
      async acquire({ decisionCase, boundary }) {
        const requested = decisionCase?.goalIds ?? [];
        let goals;
        if (requested.length) {
          goals = requested.map((goalId) => registry.get({ goalId, ...boundary })).filter((result) => result.ok).map((result) => result.data);
        } else goals = registry.list({ ...boundary, status: "active" }).data;
        return goals.map((goal) => ({ fragmentId: `goal:${goal.goalId}:v${goal.version}`, tenantId: goal.tenantId, businessId: goal.businessId, sourceType: "goal_registry", scope: "goal", recordId: goal.goalId, providerId: "adi08.goal_registry", quality: "verified", observedAt: goal.updatedAt, schemaVersion: goal.schemaVersion, sourceSystem: "infinicus_adi_goal_registry", data: { ...goal }, units: { baselineValue: goal.unit, currentValue: goal.unit, targetValue: goal.unit, progressPercent: "percent" } }));
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const contextService = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!contextService.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-08.");
    const registry = createGoalRegistry({ ...options, emit: runtime.emit, createId: runtime.createId });
    const service = runtime.registerService("adi.goal_registry", registry, { blockId: "ADI-08", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.goal.create", (request) => registry.create(request)], ["adi.goal.get", (request) => registry.get(request)], ["adi.goal.list", (request) => registry.list(request)], ["adi.goal.history", (request) => registry.history(request)], ["adi.goal.update", (request) => registry.update(request)], ["adi.goal.status.update", (request) => registry.setStatus(request)], ["adi.goal.legacy.import", (request) => registry.importLegacy(request)], ["adi.goal.legacy.export", (request) => registry.exportLegacy(request)]];
    for (const [name, handler] of routes) {
      const result = runtime.registerRoute(name, handler, { blockId: "ADI-08" });
      if (!result.ok) return result;
    }
    const provider = contextService.data.providers.register({ providerId: "adi08.goal_registry", sourceType: "goal_registry", blockId: "ADI-08" }, createGoalContextProvider(registry));
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-08", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-08", service: "adi.goal_registry", providerId: "adi08.goal_registry", routes: routes.map(([name]) => name) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-08"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-09-Decision-Trigger-Registry ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-09-Decision-Trigger-Registry/src/adi-09-decision-trigger-registry.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/index.js
  var src_exports = {};
  __export(src_exports, {
    TRANSITIONS: () => TRANSITIONS,
    TRIGGER_SEVERITIES: () => TRIGGER_SEVERITIES,
    TRIGGER_STATUSES: () => TRIGGER_STATUSES,
    TRIGGER_TYPES: () => TRIGGER_TYPES,
    attachToADIRuntime: () => attachToADIRuntime,
    createTriggerContextProvider: () => createTriggerContextProvider,
    createTriggerRegistry: () => createTriggerRegistry,
    createTriggerRepository: () => createTriggerRepository
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/constants.js
  var TRIGGER_TYPES = Object.freeze(["manual", "threshold", "anomaly", "goal_variance", "risk", "opportunity", "simulation", "outcome_monitoring", "external_verified"]);
  var TRIGGER_SEVERITIES = Object.freeze(["info", "low", "medium", "high", "critical"]);
  var TRIGGER_STATUSES = Object.freeze(["open", "acknowledged", "linked", "resolved", "dismissed", "expired"]);
  var TRANSITIONS = Object.freeze({ open: ["acknowledged", "linked", "resolved", "dismissed", "expired"], acknowledged: ["linked", "resolved", "dismissed", "expired"], linked: ["resolved", "dismissed", "expired"], resolved: [], dismissed: [], expired: [] });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/repository.js
  function createTriggerRepository() {
    const histories = /* @__PURE__ */ new Map(), keys = /* @__PURE__ */ new Map();
    const boundary = (t, b) => `${t}::${b}`;
    return Object.freeze({ create(record) {
      if (histories.has(record.triggerId)) return false;
      histories.set(record.triggerId, [record]);
      return true;
    }, append(record) {
      const h = histories.get(record.triggerId);
      if (!h || record.version !== h.at(-1).version + 1) return false;
      h.push(record);
      return true;
    }, get({ triggerId, tenantId, businessId, version }) {
      const h = histories.get(triggerId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, history({ triggerId, tenantId, businessId }) {
      return (histories.get(triggerId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    }, list({ tenantId, businessId, status, severity, goalId }) {
      return [...histories.values()].map((h) => h.at(-1)).filter((x) => x.tenantId === tenantId && x.businessId === businessId && (!status || x.status === status) && (!severity || x.severity === severity) && (!goalId || x.goalId === goalId));
    }, dedupeGet({ tenantId, businessId, key }) {
      return keys.get(`${boundary(tenantId, businessId)}::${key}`) ?? null;
    }, dedupeSet({ tenantId, businessId, key, triggerId }) {
      if (key) keys.set(`${boundary(tenantId, businessId)}::${key}`, triggerId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/trigger-registry.js
  var id = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var text = (value) => typeof value === "string" ? value.trim() : "";
  function validate(input, update = false) {
    const errors = [];
    if (!text(input.tenantId)) errors.push("tenant_id_required");
    if (!text(input.businessId)) errors.push("business_id_required");
    if (!update && text(input.title).length < 3) errors.push("title_required");
    if (input.triggerType && !TRIGGER_TYPES.includes(input.triggerType)) errors.push("trigger_type_invalid");
    if (input.severity && !TRIGGER_SEVERITIES.includes(input.severity)) errors.push("severity_invalid");
    if (input.status && !TRIGGER_STATUSES.includes(input.status)) errors.push("status_invalid");
    if (input.observedAt && Number.isNaN(Date.parse(input.observedAt))) errors.push("observed_at_invalid");
    if (input.expiresAt && Number.isNaN(Date.parse(input.expiresAt))) errors.push("expires_at_invalid");
    return errors;
  }
  function createTriggerRegistry(options = {}) {
    const repository = options.repository ?? createTriggerRepository();
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    const resolveGoal = options.resolveGoal;
    async function create(input = {}) {
      const errors = validate(input);
      if (errors.length) return failure("ADI_TRIGGER_INVALID", "Trigger failed validation.", { errors });
      if (input.goalId && resolveGoal) {
        const goal = await resolveGoal({ goalId: input.goalId, tenantId: input.tenantId, businessId: input.businessId });
        if (!goal?.ok) return failure("ADI_TRIGGER_GOAL_INVALID", "Linked goal was not found inside the trigger boundary.");
      }
      const dedupeKey = input.idempotencyKey ?? input.signalFingerprint ?? null;
      if (dedupeKey) {
        const existingId = repository.dedupeGet({ tenantId: input.tenantId, businessId: input.businessId, key: dedupeKey });
        if (existingId) return get({ triggerId: existingId, tenantId: input.tenantId, businessId: input.businessId });
      }
      const createdAt = now().toISOString();
      const record = Object.freeze({ triggerId: input.triggerId ?? createId("trigger"), tenantId: input.tenantId, businessId: input.businessId, goalId: input.goalId ?? null, triggerType: input.triggerType ?? "manual", title: text(input.title), description: text(input.description), severity: input.severity ?? "medium", status: input.status ?? "open", observedAt: input.observedAt ?? createdAt, expiresAt: input.expiresAt ?? null, sourceType: input.sourceType ?? "manual", sourceRef: input.sourceRef ?? null, evidenceIds: Object.freeze([...input.evidenceIds ?? []]), signalFingerprint: input.signalFingerprint ?? null, acknowledgedBy: null, acknowledgedAt: null, resolutionReason: null, version: 1, createdAt, updatedAt: createdAt, schemaVersion: "1.0.0" });
      if (!repository.create(record)) return failure("ADI_TRIGGER_DUPLICATE_ID", "Trigger ID already exists.");
      repository.dedupeSet({ tenantId: record.tenantId, businessId: record.businessId, key: dedupeKey, triggerId: record.triggerId });
      await emit("adi.trigger.created", record, { tenantId: record.tenantId, businessId: record.businessId });
      return success(record);
    }
    function get(query) {
      const record = repository.get(query);
      return record ? success(record) : failure("ADI_TRIGGER_NOT_FOUND", "Trigger was not found inside the requested boundary.");
    }
    function list(query) {
      return success(repository.list(query));
    }
    function history(query) {
      return success(repository.history(query));
    }
    async function update(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      const errors = validate({ ...input, tenantId: found.data.tenantId, businessId: found.data.businessId }, true);
      if (errors.length) return failure("ADI_TRIGGER_INVALID", "Trigger update failed validation.", { errors });
      const next = { ...found.data };
      for (const field of ["title", "description", "severity", "goalId", "expiresAt", "sourceRef", "evidenceIds"]) {
        if (input[field] !== void 0) next[field] = field === "evidenceIds" ? Object.freeze([...input[field]]) : input[field];
      }
      next.version = found.data.version + 1;
      next.updatedAt = now().toISOString();
      const record = Object.freeze(next);
      if (!repository.append(record)) return failure("ADI_TRIGGER_VERSION_CONFLICT", "Trigger version could not be appended.");
      await emit("adi.trigger.updated", { triggerId: record.triggerId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId });
      return success(record);
    }
    async function setStatus(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      const status = input.status;
      if (!TRIGGER_STATUSES.includes(status) || !TRANSITIONS[found.data.status]?.includes(status)) return failure("ADI_TRIGGER_TRANSITION_INVALID", `Cannot transition ${found.data.status} to ${status}.`);
      const next = Object.freeze({ ...found.data, status, acknowledgedBy: status === "acknowledged" ? input.actorId ?? null : found.data.acknowledgedBy, acknowledgedAt: status === "acknowledged" ? now().toISOString() : found.data.acknowledgedAt, resolutionReason: ["resolved", "dismissed"].includes(status) ? input.reason ?? null : found.data.resolutionReason, version: found.data.version + 1, updatedAt: now().toISOString() });
      if (!repository.append(next)) return failure("ADI_TRIGGER_VERSION_CONFLICT", "Trigger version could not be appended.");
      await emit("adi.trigger.status.updated", { triggerId: next.triggerId, status: next.status, version: next.version }, { tenantId: next.tenantId, businessId: next.businessId });
      return success(next);
    }
    async function importLegacy(input) {
      return create({ ...input, tenantId: input.tenantId, sourceType: input.sourceType ?? "legacy_goal_registry" });
    }
    function exportLegacy(query) {
      const found = get(query);
      if (!found.ok) return found;
      const x = found.data;
      return success({ triggerId: x.triggerId, businessId: x.businessId, goalId: x.goalId, triggerType: x.triggerType, title: x.title, description: x.description, severity: x.severity, status: x.status, observedAt: x.observedAt, version: x.version });
    }
    return Object.freeze({ blockId: "ADI-09", version: "1.0.0", create, get, list, history, update, setStatus, importLegacy, exportLegacy });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/context-provider.js
  function createTriggerContextProvider(registry) {
    return Object.freeze({ async acquire({ decisionCase, boundary }) {
      const requested = decisionCase?.triggerIds ?? [];
      let triggers;
      if (requested.length) triggers = requested.map((triggerId) => registry.get({ triggerId, ...boundary })).filter((x) => x.ok).map((x) => x.data);
      else triggers = registry.list({ ...boundary, status: "open" }).data;
      return triggers.map((x) => ({ fragmentId: `trigger:${x.triggerId}:v${x.version}`, tenantId: x.tenantId, businessId: x.businessId, sourceType: "trigger_registry", scope: "trigger", recordId: x.triggerId, providerId: "adi09.trigger_registry", quality: x.evidenceIds.length ? "verified" : "unknown", observedAt: x.observedAt, schemaVersion: x.schemaVersion, sourceSystem: "infinicus_adi_trigger_registry", data: { ...x }, units: {} }));
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const context = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!context.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-09.");
    const goals = runtime.getService("adi.goal_registry");
    const registry = createTriggerRegistry({ ...options, createId: runtime.createId, emit: runtime.emit, resolveGoal: options.resolveGoal ?? (goals.ok ? (q) => goals.data.get(q) : void 0) });
    const service = runtime.registerService("adi.trigger_registry", registry, { blockId: "ADI-09", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.trigger.create", (q) => registry.create(q)], ["adi.trigger.get", (q) => registry.get(q)], ["adi.trigger.list", (q) => registry.list(q)], ["adi.trigger.history", (q) => registry.history(q)], ["adi.trigger.update", (q) => registry.update(q)], ["adi.trigger.status.update", (q) => registry.setStatus(q)], ["adi.trigger.legacy.import", (q) => registry.importLegacy(q)], ["adi.trigger.legacy.export", (q) => registry.exportLegacy(q)]];
    for (const [n, h] of routes) {
      const result = runtime.registerRoute(n, h, { blockId: "ADI-09" });
      if (!result.ok) return result;
    }
    const provider = context.data.providers.register({ providerId: "adi09.trigger_registry", sourceType: "trigger_registry", blockId: "ADI-09" }, createTriggerContextProvider(registry));
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-09", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-09", service: "adi.trigger_registry", providerId: "adi09.trigger_registry", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-09"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-10-Business-Problem-Definition-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/adi-10-business-problem-definition-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    PROBLEM_SOURCES: () => PROBLEM_SOURCES,
    PROBLEM_STATUSES: () => PROBLEM_STATUSES,
    PROBLEM_URGENCIES: () => PROBLEM_URGENCIES,
    TRANSITIONS: () => TRANSITIONS,
    attachToADIRuntime: () => attachToADIRuntime,
    createProblemContextProvider: () => createProblemContextProvider,
    createProblemDefinitionEngine: () => createProblemDefinitionEngine,
    createProblemRepository: () => createProblemRepository
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/constants.js
  var PROBLEM_STATUSES = Object.freeze(["draft", "open", "in_analysis", "resolved", "cancelled", "superseded"]);
  var PROBLEM_URGENCIES = Object.freeze(["low", "medium", "high", "critical"]);
  var PROBLEM_SOURCES = Object.freeze(["manual", "trigger", "goal_variance", "business_intelligence", "simulation", "outcome_monitoring", "continuous_learning"]);
  var TRANSITIONS = Object.freeze({ draft: ["open", "cancelled"], open: ["in_analysis", "resolved", "cancelled", "superseded"], in_analysis: ["resolved", "cancelled", "superseded"], resolved: [], cancelled: [], superseded: [] });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/repository.js
  function createProblemRepository() {
    const histories = /* @__PURE__ */ new Map(), keys = /* @__PURE__ */ new Map();
    const boundary = (t, b) => `${t}::${b}`;
    return Object.freeze({ create(r) {
      if (histories.has(r.problemId)) return false;
      histories.set(r.problemId, [r]);
      return true;
    }, append(r) {
      const h = histories.get(r.problemId);
      if (!h || r.version !== h.at(-1).version + 1) return false;
      h.push(r);
      return true;
    }, get({ problemId, tenantId, businessId, version }) {
      const h = histories.get(problemId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, history({ problemId, tenantId, businessId }) {
      return (histories.get(problemId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    }, list({ tenantId, businessId, status, urgency, decisionId }) {
      return [...histories.values()].map((h) => h.at(-1)).filter((x) => x.tenantId === tenantId && x.businessId === businessId && (!status || x.status === status) && (!urgency || x.urgency === urgency) && (!decisionId || x.decisionId === decisionId));
    }, keyGet({ tenantId, businessId, key }) {
      return keys.get(`${boundary(tenantId, businessId)}::${key}`) ?? null;
    }, keySet({ tenantId, businessId, key, problemId }) {
      if (key) keys.set(`${boundary(tenantId, businessId)}::${key}`, problemId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/problem-engine.js
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var text = (v) => typeof v === "string" ? v.trim() : "";
  var textList = (v) => Array.isArray(v) ? v.map(text).filter(Boolean) : typeof v === "string" ? v.split(/\r?\n/).map(text).filter(Boolean) : [];
  function validate(input, update = false) {
    const errors = [];
    if (!text(input.tenantId)) errors.push("tenant_id_required");
    if (!text(input.businessId)) errors.push("business_id_required");
    if (!update && text(input.title).length < 3) errors.push("title_required");
    if (!update && text(input.statement).length < 20) errors.push("statement_too_short");
    if (!update && text(input.desiredOutcome).length < 10) errors.push("desired_outcome_required");
    if (input.urgency && !PROBLEM_URGENCIES.includes(input.urgency)) errors.push("urgency_invalid");
    if (input.status && !PROBLEM_STATUSES.includes(input.status)) errors.push("status_invalid");
    if (input.source && !PROBLEM_SOURCES.includes(input.source)) errors.push("source_invalid");
    if (input.decisionDeadline && Number.isNaN(Date.parse(input.decisionDeadline))) errors.push("decision_deadline_invalid");
    return errors;
  }
  function createProblemDefinitionEngine(options = {}) {
    const repository = options.repository ?? createProblemRepository();
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    const resolveGoal = options.resolveGoal, resolveTrigger = options.resolveTrigger, resolveEvidence = options.resolveEvidence;
    async function validateReferences(input) {
      const errors = [];
      if (input.goalId && resolveGoal) {
        const r = await resolveGoal({ goalId: input.goalId, tenantId: input.tenantId, businessId: input.businessId });
        if (!r?.ok) errors.push("goal_reference_invalid");
      }
      for (const triggerId of input.triggerIds ?? (input.triggerId ? [input.triggerId] : [])) {
        if (resolveTrigger) {
          const r = await resolveTrigger({ triggerId, tenantId: input.tenantId, businessId: input.businessId });
          if (!r?.ok) errors.push(`trigger_reference_invalid:${triggerId}`);
        }
      }
      for (const evidenceId of input.evidenceIds ?? []) {
        if (resolveEvidence) {
          const r = await resolveEvidence({ evidenceId, tenantId: input.tenantId, businessId: input.businessId, decisionId: input.decisionId });
          if (!r?.ok) errors.push(`evidence_reference_invalid:${evidenceId}`);
        }
      }
      return errors;
    }
    async function create(input = {}) {
      const errors = validate(input);
      errors.push(...await validateReferences(input));
      if (errors.length) return failure("ADI_PROBLEM_INVALID", "Problem definition failed validation.", { errors });
      if (input.idempotencyKey) {
        const existing = repository.keyGet({ tenantId: input.tenantId, businessId: input.businessId, key: input.idempotencyKey });
        if (existing) return get({ problemId: existing, tenantId: input.tenantId, businessId: input.businessId });
      }
      const framedAt = now().toISOString();
      const record = Object.freeze({ problemId: input.problemId ?? createId("problem"), tenantId: input.tenantId, businessId: input.businessId, decisionId: input.decisionId ?? null, goalId: input.goalId ?? null, triggerId: input.triggerId ?? input.triggerIds?.[0] ?? null, triggerIds: Object.freeze([...input.triggerIds ?? (input.triggerId ? [input.triggerId] : [])]), evidenceIds: Object.freeze([...input.evidenceIds ?? []]), title: text(input.title), statement: text(input.statement), decisionQuestion: text(input.decisionQuestion), desiredOutcome: text(input.desiredOutcome), scope: text(input.scope), constraints: Object.freeze(textList(input.constraints)), successCriteria: Object.freeze(textList(input.successCriteria)), assumptions: Object.freeze(textList(input.assumptions)), symptoms: Object.freeze(textList(input.symptoms)), exclusions: Object.freeze(textList(input.exclusions)), rootCauseHypotheses: Object.freeze(textList(input.rootCauseHypotheses)), urgency: input.urgency ?? "medium", status: input.status ?? "open", source: input.source ?? "manual", decisionDeadline: input.decisionDeadline ?? null, framedBy: input.framedBy ?? null, framedAt, version: 1, createdAt: framedAt, updatedAt: framedAt, schemaVersion: "1.0.0" });
      if (!repository.create(record)) return failure("ADI_PROBLEM_DUPLICATE_ID", "Problem ID already exists.");
      repository.keySet({ tenantId: record.tenantId, businessId: record.businessId, key: input.idempotencyKey, problemId: record.problemId });
      await emit("adi.problem.created", record, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    function get(q) {
      const r = repository.get(q);
      return r ? success(r) : failure("ADI_PROBLEM_NOT_FOUND", "Problem was not found inside the requested boundary.");
    }
    function list(q) {
      return success(repository.list(q));
    }
    function history(q) {
      return success(repository.history(q));
    }
    async function update(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      const candidate = { ...found.data };
      for (const field of ["title", "statement", "decisionQuestion", "desiredOutcome", "scope", "constraints", "successCriteria", "assumptions", "symptoms", "exclusions", "rootCauseHypotheses", "urgency", "decisionDeadline", "goalId", "triggerId", "triggerIds", "evidenceIds"]) {
        if (input[field] !== void 0) candidate[field] = ["constraints", "successCriteria", "assumptions", "symptoms", "exclusions", "rootCauseHypotheses"].includes(field) ? Object.freeze(textList(input[field])) : ["triggerIds", "evidenceIds"].includes(field) ? Object.freeze([...input[field]]) : input[field];
      }
      candidate.triggerIds = candidate.triggerIds ?? (candidate.triggerId ? [candidate.triggerId] : []);
      const errors = validate({ ...candidate, tenantId: found.data.tenantId, businessId: found.data.businessId }, true);
      errors.push(...await validateReferences(candidate));
      if (errors.length) return failure("ADI_PROBLEM_INVALID", "Problem update failed validation.", { errors });
      candidate.version = found.data.version + 1;
      candidate.updatedAt = now().toISOString();
      const record = Object.freeze(candidate);
      if (!repository.append(record)) return failure("ADI_PROBLEM_VERSION_CONFLICT", "Problem version could not be appended.");
      await emit("adi.problem.updated", { problemId: record.problemId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function setStatus(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      if (!PROBLEM_STATUSES.includes(input.status) || !TRANSITIONS[found.data.status]?.includes(input.status)) return failure("ADI_PROBLEM_TRANSITION_INVALID", `Cannot transition ${found.data.status} to ${input.status}.`);
      const record = Object.freeze({ ...found.data, status: input.status, resolution: input.status === "resolved" ? text(input.resolution) : found.data.resolution ?? null, version: found.data.version + 1, updatedAt: now().toISOString() });
      if (!repository.append(record)) return failure("ADI_PROBLEM_VERSION_CONFLICT", "Problem version could not be appended.");
      await emit("adi.problem.status.updated", { problemId: record.problemId, status: record.status, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function importLegacy(input) {
      return create({ ...input, tenantId: input.tenantId, triggerIds: input.triggerId ? [input.triggerId] : [], source: PROBLEM_SOURCES.includes(input.source) ? input.source : "manual" });
    }
    function exportLegacy(q) {
      const found = get(q);
      if (!found.ok) return found;
      const x = found.data;
      return success({ problemId: x.problemId, businessId: x.businessId, goalId: x.goalId, triggerId: x.triggerId, title: x.title, statement: x.statement, desiredOutcome: x.desiredOutcome, scope: x.scope, constraints: [...x.constraints], successCriteria: [...x.successCriteria], assumptions: [...x.assumptions], urgency: x.urgency, status: x.status, framedAt: x.framedAt, source: x.source, version: x.version });
    }
    return Object.freeze({ blockId: "ADI-10", version: "1.0.0", create, get, list, history, update, setStatus, importLegacy, exportLegacy });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/context-provider.js
  function createProblemContextProvider(engine) {
    return Object.freeze({ async acquire({ decisionCase, boundary }) {
      const requested = decisionCase?.problemIds ?? [];
      let items;
      if (requested.length) items = requested.map((problemId) => engine.get({ problemId, ...boundary })).filter((x) => x.ok).map((x) => x.data);
      else items = engine.list({ ...boundary, status: "open", decisionId: decisionCase?.decisionId }).data;
      return items.map((x) => ({ fragmentId: `problem:${x.problemId}:v${x.version}`, tenantId: x.tenantId, businessId: x.businessId, sourceType: "problem_registry", scope: "problem", recordId: x.problemId, providerId: "adi10.problem_definition", quality: x.evidenceIds.length ? "verified" : "unknown", observedAt: x.updatedAt, schemaVersion: x.schemaVersion, sourceSystem: "infinicus_adi_problem_definition", data: { ...x }, units: {} }));
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const context = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!context.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-10.");
    const goals = runtime.getService("adi.goal_registry"), triggers = runtime.getService("adi.trigger_registry"), evidence = runtime.getService("adi.evidence_registry");
    const engine = createProblemDefinitionEngine({ ...options, createId: runtime.createId, emit: runtime.emit, resolveGoal: options.resolveGoal ?? (goals.ok ? (q) => goals.data.get(q) : void 0), resolveTrigger: options.resolveTrigger ?? (triggers.ok ? (q) => triggers.data.get(q) : void 0), resolveEvidence: options.resolveEvidence ?? (evidence.ok ? (q) => evidence.data.get(q) : void 0) });
    const service = runtime.registerService("adi.problem_definition", engine, { blockId: "ADI-10", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.problem.create", (q) => engine.create(q)], ["adi.problem.get", (q) => engine.get(q)], ["adi.problem.list", (q) => engine.list(q)], ["adi.problem.history", (q) => engine.history(q)], ["adi.problem.update", (q) => engine.update(q)], ["adi.problem.status.update", (q) => engine.setStatus(q)], ["adi.problem.legacy.import", (q) => engine.importLegacy(q)], ["adi.problem.legacy.export", (q) => engine.exportLegacy(q)]];
    for (const [n, h] of routes) {
      const result = runtime.registerRoute(n, h, { blockId: "ADI-10" });
      if (!result.ok) return result;
    }
    const provider = context.data.providers.register({ providerId: "adi10.problem_definition", sourceType: "problem_registry", blockId: "ADI-10" }, createProblemContextProvider(engine));
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-10", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-10", service: "adi.problem_definition", providerId: "adi10.problem_definition", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-10"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/adi-11-decision-context-evidence-assembly-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    assessReadiness: () => assessReadiness,
    attachToADIRuntime: () => attachToADIRuntime,
    createAssemblyEngine: () => createAssemblyEngine,
    createAssemblyRepository: () => createAssemblyRepository,
    sha256: () => sha256
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/digest.js
  function canonical(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  }
  async function sha256(value) {
    if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
    const bytes = new TextEncoder().encode(canonical(value));
    const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/repository.js
  function createAssemblyRepository() {
    const histories = /* @__PURE__ */ new Map(), byDecision = /* @__PURE__ */ new Map();
    return Object.freeze({ append(record) {
      const h = histories.get(record.assemblyId) ?? [];
      if (h.length && record.version !== h.at(-1).version + 1) return false;
      h.push(record);
      histories.set(record.assemblyId, h);
      const key = `${record.tenantId}::${record.businessId}::${record.decisionId}`;
      const ids = byDecision.get(key) ?? /* @__PURE__ */ new Set();
      ids.add(record.assemblyId);
      byDecision.set(key, ids);
      return true;
    }, get({ assemblyId, tenantId, businessId, version }) {
      const h = histories.get(assemblyId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, list({ tenantId, businessId, decisionId }) {
      const ids = byDecision.get(`${tenantId}::${businessId}::${decisionId}`) ?? [];
      return [...ids].map((id2) => histories.get(id2).at(-1));
    }, history({ assemblyId, tenantId, businessId }) {
      return (histories.get(assemblyId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/readiness.js
  function assessReadiness({ context, evidence, goals, triggers, problems, verificationFailures, requiredSourceTypes = [] }) {
    const blockers = [], missing = [], warnings = [];
    if (!problems.length) blockers.push("problem_definition_required");
    if (!goals.length) missing.push("business_goal_missing");
    if (!evidence.length) blockers.push("verified_evidence_required");
    if (verificationFailures.length) blockers.push("evidence_verification_failed");
    if (context.quality?.usable === false) blockers.push("context_quality_unusable");
    if (context.conflicts?.length) warnings.push("context_conflicts_present");
    if (context.providerFailures?.length) warnings.push("context_provider_failures_present");
    for (const type of requiredSourceTypes) {
      if (!context.fragments.some((x) => x.sourceType === type)) missing.push(`source_missing:${type}`);
    }
    const status = blockers.length ? "blocked" : missing.length ? "needs_data" : "ready";
    return Object.freeze({ status, blockers: Object.freeze(blockers), missing: Object.freeze(missing), warnings: Object.freeze(warnings) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/assembly-engine.js
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  function createAssemblyEngine(options = {}) {
    const repository = options.repository ?? createAssemblyRepository();
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    const evidenceRegistry = options.evidenceRegistry, goalRegistry = options.goalRegistry, triggerRegistry = options.triggerRegistry, problemEngine = options.problemEngine;
    function boundaryCheck(decisionCase, context) {
      if (!decisionCase?.decisionId || !decisionCase?.security?.accessProof?.allowed) return failure("ADI_ASSEMBLY_CASE_UNSECURED", "A secured DecisionCase is required.");
      if (!context?.contextId || context.decisionId !== decisionCase.decisionId || context.tenantId !== decisionCase.tenantId || context.businessId !== decisionCase.businessId) return failure("ADI_ASSEMBLY_CONTEXT_MISMATCH", "DecisionContextEnvelope boundary does not match.");
      if (context.accessDecisionId !== decisionCase.security.accessProof.accessDecisionId) return failure("ADI_ASSEMBLY_ACCESS_MISMATCH", "Context authorization does not match the DecisionCase.");
      return success({ tenantId: decisionCase.tenantId, businessId: decisionCase.businessId, decisionId: decisionCase.decisionId });
    }
    async function assemble(input = {}) {
      const decisionCase = input.decisionCase, context = input.contextEnvelope;
      const boundary = boundaryCheck(decisionCase, context);
      if (!boundary.ok) return boundary;
      const q = boundary.data;
      const evidence = evidenceRegistry?.list(q)?.data ?? [];
      const goals = (decisionCase.goalIds ?? []).map((goalId) => goalRegistry?.get({ ...q, goalId })).filter((x) => x?.ok).map((x) => x.data);
      const triggers = (decisionCase.triggerIds ?? []).map((triggerId) => triggerRegistry?.get({ ...q, triggerId })).filter((x) => x?.ok).map((x) => x.data);
      let problems = (decisionCase.problemIds ?? []).map((problemId) => problemEngine?.get({ ...q, problemId })).filter((x) => x?.ok).map((x) => x.data);
      if (!problems.length && problemEngine) problems = problemEngine.list({ ...q, status: "open" }).data;
      const verificationFailures = [];
      for (const record2 of evidence) {
        const verified = await evidenceRegistry.verify({ ...q, evidenceId: record2.evidenceId });
        if (!verified.ok || !verified.data.valid) verificationFailures.push(record2.evidenceId);
      }
      const readiness = assessReadiness({ context, evidence, goals, triggers, problems, verificationFailures, requiredSourceTypes: input.requiredSourceTypes ?? [] });
      const assembledAt = now().toISOString();
      const digestInput = { decisionId: q.decisionId, contextId: context.contextId, evidence: evidence.map((x) => [x.evidenceId, x.contentHash]), goals: goals.map((x) => [x.goalId, x.version]), triggers: triggers.map((x) => [x.triggerId, x.version]), problems: problems.map((x) => [x.problemId, x.version]), readiness };
      let digest;
      try {
        digest = await sha256(digestInput);
      } catch (error) {
        return failure("ADI_ASSEMBLY_DIGEST_FAILED", "Assembly digest could not be generated.", { message: error.message });
      }
      const record = Object.freeze({ assemblyId: input.assemblyId ?? createId("assembly"), tenantId: q.tenantId, businessId: q.businessId, decisionId: q.decisionId, accessDecisionId: context.accessDecisionId, contextId: context.contextId, contextSummary: Object.freeze({ fragmentIds: Object.freeze(context.fragments.map((x) => x.fragmentId)), sourceTypes: Object.freeze([...new Set(context.fragments.map((x) => x.sourceType))]), quality: context.quality, conflictCount: context.conflicts?.length ?? 0, missingSourceTypes: Object.freeze([...context.missingSourceTypes ?? []]) }), evidenceRefs: Object.freeze(evidence.map((x) => Object.freeze({ evidenceId: x.evidenceId, contentHash: x.contentHash, quality: x.quality, freshness: x.freshness }))), goalRefs: Object.freeze(goals.map((x) => Object.freeze({ goalId: x.goalId, version: x.version, progressPercent: x.progressPercent }))), triggerRefs: Object.freeze(triggers.map((x) => Object.freeze({ triggerId: x.triggerId, version: x.version, severity: x.severity, status: x.status }))), problemRefs: Object.freeze(problems.map((x) => Object.freeze({ problemId: x.problemId, version: x.version, urgency: x.urgency, status: x.status }))), verificationFailures: Object.freeze(verificationFailures), readiness, assemblyDigest: digest, digestAlgorithm: "SHA-256", status: readiness.status, version: 1, assembledAt, updatedAt: assembledAt, schemaVersion: "1.0.0" });
      if (!repository.append(record)) return failure("ADI_ASSEMBLY_VERSION_CONFLICT", "Assembly could not be stored.");
      await emit("adi.analysis_case.assembled", { assemblyId: record.assemblyId, decisionId: record.decisionId, status: record.status, digest: record.assemblyDigest }, q);
      return success(record);
    }
    function get(q) {
      const r = repository.get(q);
      return r ? success(r) : failure("ADI_ASSEMBLY_NOT_FOUND", "Assembly was not found inside the requested boundary.");
    }
    function list(q) {
      return success(repository.list(q));
    }
    function history(q) {
      return success(repository.history(q));
    }
    async function verify(q) {
      const found = get(q);
      if (!found.ok) return found;
      const r = found.data;
      const digestInput = { decisionId: r.decisionId, contextId: r.contextId, evidence: r.evidenceRefs.map((x) => [x.evidenceId, x.contentHash]), goals: r.goalRefs.map((x) => [x.goalId, x.version]), triggers: r.triggerRefs.map((x) => [x.triggerId, x.version]), problems: r.problemRefs.map((x) => [x.problemId, x.version]), readiness: r.readiness };
      const actual = await sha256(digestInput);
      return success({ assemblyId: r.assemblyId, valid: actual === r.assemblyDigest, expectedDigest: r.assemblyDigest, actualDigest: actual });
    }
    return Object.freeze({ blockId: "ADI-11", version: "1.0.0", assemble, get, list, history, verify });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const services = { evidenceRegistry: runtime.getService("adi.evidence_registry"), goalRegistry: runtime.getService("adi.goal_registry"), triggerRegistry: runtime.getService("adi.trigger_registry"), problemEngine: runtime.getService("adi.problem_definition") };
    if (Object.values(services).some((x) => !x.ok)) return failure("ADI_ASSEMBLY_DEPENDENCY_REQUIRED", "ADI-07 through ADI-10 must be attached before ADI-11.");
    const engine = createAssemblyEngine({ ...options, createId: runtime.createId, emit: runtime.emit, ...Object.fromEntries(Object.entries(services).map(([k, v]) => [k, v.data])) });
    const service = runtime.registerService("adi.context_evidence_assembly", engine, { blockId: "ADI-11", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.analysis_case.assemble", (q) => engine.assemble(q)], ["adi.analysis_case.get", (q) => engine.get(q)], ["adi.analysis_case.list", (q) => engine.list(q)], ["adi.analysis_case.history", (q) => engine.history(q)], ["adi.analysis_case.verify", (q) => engine.verify(q)]];
    for (const [n, h] of routes) {
      const x = runtime.registerRoute(n, h, { blockId: "ADI-11" });
      if (!x.ok) return x;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-11", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-11", service: "adi.context_evidence_assembly", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-11"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/adi-12-decision-objectives-constraints-criteria-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    CONSTRAINT_TYPES: () => CONSTRAINT_TYPES,
    CRITERION_DIRECTIONS: () => CRITERION_DIRECTIONS,
    FRAMEWORK_STATUSES: () => FRAMEWORK_STATUSES,
    OBJECTIVE_PRIORITIES: () => OBJECTIVE_PRIORITIES,
    OPERATORS: () => OPERATORS,
    attachToADIRuntime: () => attachToADIRuntime,
    createFrameworkEngine: () => createFrameworkEngine,
    createFrameworkRepository: () => createFrameworkRepository,
    normalizeCriteria: () => normalizeCriteria,
    validateFrameworkInput: () => validateFrameworkInput
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/repository.js
  function createFrameworkRepository() {
    const histories = /* @__PURE__ */ new Map(), byAssembly = /* @__PURE__ */ new Map();
    return Object.freeze({ create(r) {
      if (histories.has(r.frameworkId)) return false;
      histories.set(r.frameworkId, [r]);
      byAssembly.set(`${r.tenantId}::${r.businessId}::${r.assemblyId}`, r.frameworkId);
      return true;
    }, append(r) {
      const h = histories.get(r.frameworkId);
      if (!h || r.version !== h.at(-1).version + 1) return false;
      h.push(r);
      return true;
    }, get({ frameworkId, tenantId, businessId, version }) {
      const h = histories.get(frameworkId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, findByAssembly({ assemblyId, tenantId, businessId }) {
      const id2 = byAssembly.get(`${tenantId}::${businessId}::${assemblyId}`);
      return id2 ? histories.get(id2).at(-1) : null;
    }, list({ tenantId, businessId, decisionId, status }) {
      return [...histories.values()].map((h) => h.at(-1)).filter((x) => x.tenantId === tenantId && x.businessId === businessId && (!decisionId || x.decisionId === decisionId) && (!status || x.status === status));
    }, history({ frameworkId, tenantId, businessId }) {
      return (histories.get(frameworkId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/constants.js
  var FRAMEWORK_STATUSES = Object.freeze(["draft", "validated", "locked", "superseded"]);
  var OBJECTIVE_PRIORITIES = Object.freeze(["low", "medium", "high", "critical"]);
  var CONSTRAINT_TYPES = Object.freeze(["hard", "soft", "regulatory", "budget", "time", "capacity", "policy", "ethical"]);
  var OPERATORS = Object.freeze(["<=", ">=", "=", "<", ">", "in", "not_in", "contains"]);
  var CRITERION_DIRECTIONS = Object.freeze(["maximize", "minimize", "target", "threshold", "qualitative"]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/validator.js
  var text = (v) => typeof v === "string" ? v.trim() : "";
  function validateFrameworkInput(input) {
    const errors = [];
    if (!Array.isArray(input.objectives) || !input.objectives.length) errors.push("objective_required");
    if (!Array.isArray(input.criteria) || !input.criteria.length) errors.push("criterion_required");
    for (const [x, i] of (input.objectives ?? []).map((x2, i2) => [x2, i2])) {
      if (!text(x.title) || !text(x.desiredOutcome)) errors.push(`objective_invalid:${i}`);
      if (x.priority && !OBJECTIVE_PRIORITIES.includes(x.priority)) errors.push(`objective_priority_invalid:${i}`);
    }
    for (const [x, i] of (input.constraints ?? []).map((x2, i2) => [x2, i2])) {
      if (!text(x.description) || !CONSTRAINT_TYPES.includes(x.type) || !OPERATORS.includes(x.operator)) errors.push(`constraint_invalid:${i}`);
      if (x.value === void 0) errors.push(`constraint_value_required:${i}`);
      if (typeof x.value === "number" && !text(x.unit)) errors.push(`constraint_unit_required:${i}`);
    }
    for (const [x, i] of (input.criteria ?? []).map((x2, i2) => [x2, i2])) {
      if (!text(x.name) || !CRITERION_DIRECTIONS.includes(x.direction) || !Number.isFinite(Number(x.weight)) || Number(x.weight) < 0) errors.push(`criterion_invalid:${i}`);
      if (["maximize", "minimize", "target", "threshold"].includes(x.direction) && !text(x.unit)) errors.push(`criterion_unit_required:${i}`);
    }
    const total = (input.criteria ?? []).reduce((s, x) => s + Number(x.weight || 0), 0);
    if ((input.criteria ?? []).length && total <= 0) errors.push("criterion_weight_total_invalid");
    return Object.freeze(errors);
  }
  function normalizeCriteria(criteria) {
    const total = criteria.reduce((s, x) => s + Number(x.weight), 0);
    return Object.freeze(criteria.map((x) => Object.freeze({ ...x, weight: Number(x.weight), normalizedWeight: Math.round(Number(x.weight) / total * 1e6) / 1e6 })));
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/framework-engine.js
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var freezeList = (x) => Object.freeze(structuredClone(x));
  function createFrameworkEngine(options = {}) {
    const repository = options.repository ?? createFrameworkRepository();
    const assemblyEngine = options.assemblyEngine;
    const problemEngine = options.problemEngine;
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    async function create(input = {}) {
      if (!input.assemblyId || !input.tenantId || !input.businessId) return failure("ADI_FRAMEWORK_BOUNDARY_REQUIRED", "Assembly and business boundaries are required.");
      const assembly = assemblyEngine?.get({ assemblyId: input.assemblyId, tenantId: input.tenantId, businessId: input.businessId });
      if (!assembly?.ok) return failure("ADI_FRAMEWORK_ASSEMBLY_INVALID", "ADI-11 assembly was not found.");
      if (assembly.data.status !== "ready" && !input.governanceOverride) return failure("ADI_FRAMEWORK_ASSEMBLY_NOT_READY", "Only a ready assembly may create a framework without a governance override.");
      const existing = repository.findByAssembly(input);
      if (existing) return success(existing, { duplicate: true });
      const errors = validateFrameworkInput(input);
      if (errors.length) return failure("ADI_FRAMEWORK_INVALID", "Evaluation framework failed validation.", { errors });
      const createdAt = now().toISOString();
      const record = Object.freeze({ frameworkId: input.frameworkId ?? createId("framework"), assemblyId: input.assemblyId, assemblyDigest: assembly.data.assemblyDigest, tenantId: input.tenantId, businessId: input.businessId, decisionId: assembly.data.decisionId, problemId: input.problemId ?? assembly.data.problemRefs?.[0]?.problemId ?? null, objectives: freezeList(input.objectives.map((x, i) => ({ objectiveId: x.objectiveId ?? createId("objective"), title: x.title, desiredOutcome: x.desiredOutcome, metric: x.metric ?? null, targetValue: x.targetValue ?? null, unit: x.unit ?? null, priority: x.priority ?? "medium", goalId: x.goalId ?? null, evidenceIds: [...x.evidenceIds ?? []], sequence: i + 1 }))), constraints: freezeList((input.constraints ?? []).map((x, i) => ({ constraintId: x.constraintId ?? createId("constraint"), type: x.type, description: x.description, metric: x.metric ?? null, operator: x.operator, value: structuredClone(x.value), unit: x.unit ?? null, hard: x.hard ?? ["hard", "regulatory", "policy", "ethical"].includes(x.type), evidenceIds: [...x.evidenceIds ?? []], sequence: i + 1 }))), criteria: normalizeCriteria(input.criteria.map((x, i) => ({ criterionId: x.criterionId ?? createId("criterion"), name: x.name, description: x.description ?? "", direction: x.direction, weight: Number(x.weight), metric: x.metric ?? null, targetValue: x.targetValue ?? null, threshold: x.threshold ?? null, unit: x.unit ?? null, evidenceIds: [...x.evidenceIds ?? []], sequence: i + 1 }))), stakeholderIds: Object.freeze([...input.stakeholderIds ?? []]), weightingMethod: input.weightingMethod ?? "direct_supplied_weights", governanceOverride: input.governanceOverride ?? null, status: "draft", version: 1, createdAt, updatedAt: createdAt, schemaVersion: "1.0.0" });
      if (!repository.create(record)) return failure("ADI_FRAMEWORK_DUPLICATE_ID", "Framework ID already exists.");
      await emit("adi.evaluation_framework.created", { frameworkId: record.frameworkId, decisionId: record.decisionId }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    function get(q) {
      const r = repository.get(q);
      return r ? success(r) : failure("ADI_FRAMEWORK_NOT_FOUND", "Framework was not found inside the requested boundary.");
    }
    function list(q) {
      return success(repository.list(q));
    }
    function history(q) {
      return success(repository.history(q));
    }
    async function update(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      if (found.data.status === "locked") return failure("ADI_FRAMEWORK_LOCKED", "Locked frameworks cannot be changed.");
      const candidate = { ...found.data };
      for (const field of ["objectives", "constraints", "criteria", "stakeholderIds", "weightingMethod"]) {
        if (input[field] !== void 0) candidate[field] = input[field];
      }
      const errors = validateFrameworkInput(candidate);
      if (errors.length) return failure("ADI_FRAMEWORK_INVALID", "Framework update failed validation.", { errors });
      candidate.objectives = freezeList(candidate.objectives);
      candidate.constraints = freezeList(candidate.constraints);
      candidate.criteria = normalizeCriteria(candidate.criteria);
      candidate.version = found.data.version + 1;
      candidate.status = "draft";
      candidate.updatedAt = now().toISOString();
      const record = Object.freeze(candidate);
      if (!repository.append(record)) return failure("ADI_FRAMEWORK_VERSION_CONFLICT", "Framework version could not be appended.");
      await emit("adi.evaluation_framework.updated", { frameworkId: record.frameworkId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function setStatus(input, status) {
      const found = get(input);
      if (!found.ok) return found;
      const current = found.data.status;
      const allowed = { draft: ["validated"], validated: ["locked", "draft"], locked: ["superseded"], superseded: [] };
      if (!FRAMEWORK_STATUSES.includes(status) || !allowed[current]?.includes(status)) return failure("ADI_FRAMEWORK_TRANSITION_INVALID", `Cannot transition ${current} to ${status}.`);
      const record = Object.freeze({ ...found.data, status, version: found.data.version + 1, updatedAt: now().toISOString(), validatedAt: status === "validated" ? now().toISOString() : found.data.validatedAt ?? null, lockedAt: status === "locked" ? now().toISOString() : found.data.lockedAt ?? null });
      if (!repository.append(record)) return failure("ADI_FRAMEWORK_VERSION_CONFLICT", "Framework version could not be appended.");
      await emit(`adi.evaluation_framework.${status}`, { frameworkId: record.frameworkId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function fromProblem(input = {}) {
      const problem = problemEngine?.get({ problemId: input.problemId, tenantId: input.tenantId, businessId: input.businessId });
      if (!problem?.ok) return failure("ADI_FRAMEWORK_PROBLEM_INVALID", "Problem definition was not found.");
      const p = problem.data;
      return create({ ...input, objectives: [{ title: p.title, desiredOutcome: p.desiredOutcome, priority: p.urgency === "critical" ? "critical" : "high", goalId: p.goalId, evidenceIds: p.evidenceIds }], constraints: p.constraints.map((description) => ({ type: "soft", description, operator: "contains", value: description, unit: null, evidenceIds: p.evidenceIds })), criteria: input.criteria });
    }
    return Object.freeze({ blockId: "ADI-12", version: "1.0.0", create, get, list, history, update, validate: (q) => setStatus(q, "validated"), lock: (q) => setStatus(q, "locked"), supersede: (q) => setStatus(q, "superseded"), fromProblem });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const assembly = runtime.getService("adi.context_evidence_assembly"), problems = runtime.getService("adi.problem_definition");
    if (!assembly.ok || !problems.ok) return failure("ADI_FRAMEWORK_DEPENDENCY_REQUIRED", "ADI-10 and ADI-11 must be attached before ADI-12.");
    const engine = createFrameworkEngine({ ...options, assemblyEngine: assembly.data, problemEngine: problems.data, createId: runtime.createId, emit: runtime.emit });
    const service = runtime.registerService("adi.evaluation_framework", engine, { blockId: "ADI-12", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.evaluation_framework.create", (q) => engine.create(q)], ["adi.evaluation_framework.from_problem", (q) => engine.fromProblem(q)], ["adi.evaluation_framework.get", (q) => engine.get(q)], ["adi.evaluation_framework.list", (q) => engine.list(q)], ["adi.evaluation_framework.history", (q) => engine.history(q)], ["adi.evaluation_framework.update", (q) => engine.update(q)], ["adi.evaluation_framework.validate", (q) => engine.validate(q)], ["adi.evaluation_framework.lock", (q) => engine.lock(q)], ["adi.evaluation_framework.supersede", (q) => engine.supersede(q)]];
    for (const [n, h] of routes) {
      const x = runtime.registerRoute(n, h, { blockId: "ADI-12" });
      if (!x.ok) return x;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-12", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-12", service: "adi.evaluation_framework", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-12"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-13-Strategic-Alternative-Generation-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-13-Strategic-Alternative-Generation-Engine/src/adi-13-strategic-alternative-generation-engine.js --- */
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
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-13-Strategic-Alternative-Generation-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createAlternativeGenerationEngine: () => createAlternativeGenerationEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var key = (x) => `${String(x.title ?? "").trim().toLowerCase()}::${String(x.summary ?? "").trim().toLowerCase()}`;
  function createAlternativeGenerationEngine(options = {}) {
    const frameworkEngine = options.frameworkEngine;
    const generators = options.generators ?? [];
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => ok(null));
    const sets = /* @__PURE__ */ new Map();
    async function generate(input = {}) {
      const framework = frameworkEngine?.get({ frameworkId: input.frameworkId, tenantId: input.tenantId, businessId: input.businessId });
      if (!framework?.ok) return fail("ADI_ALTERNATIVE_FRAMEWORK_INVALID", "Locked ADI-12 framework was not found.");
      if (framework.data.status !== "locked") return fail("ADI_ALTERNATIVE_FRAMEWORK_UNLOCKED", "Alternatives require a locked framework.");
      const raw = [...input.manualAlternatives ?? []];
      for (const provider of generators) {
        if (typeof provider?.generate !== "function") continue;
        try {
          const result = await provider.generate({ framework: framework.data, analysisCase: input.analysisCase ?? null, requestedCount: input.requestedCount ?? 3 });
          for (const item of result ?? []) raw.push({ ...item, generatorId: provider.generatorId ?? "unidentified_provider" });
        } catch (error) {
          if (input.failOnProviderError) return fail("ADI_ALTERNATIVE_PROVIDER_FAILED", "Alternative provider failed.", { generatorId: provider.generatorId, message: error.message });
        }
      }
      if (input.includeBaseline !== false) raw.unshift({ title: "Maintain current course", summary: "Make no new intervention during the decision horizon.", actionType: "do_nothing", generatorId: "adi13.baseline_policy", assumptions: [], resourceRequirements: [], evidenceIds: [] });
      const seen = /* @__PURE__ */ new Set(), alternatives = [];
      for (const item of raw) {
        if (!String(item.title ?? "").trim() || !String(item.summary ?? "").trim()) continue;
        const fingerprint = key(item);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        alternatives.push(Object.freeze({ alternativeId: item.alternativeId ?? createId("alternative"), title: String(item.title).trim(), summary: String(item.summary).trim(), actionType: item.actionType ?? "strategic_action", actions: Object.freeze(structuredClone(item.actions ?? [])), resourceRequirements: Object.freeze(structuredClone(item.resourceRequirements ?? [])), assumptions: Object.freeze(structuredClone(item.assumptions ?? [])), evidenceIds: Object.freeze([...item.evidenceIds ?? []]), generatorId: item.generatorId ?? "manual", generatorVersion: item.generatorVersion ?? null, status: "proposed", createdAt: (/* @__PURE__ */ new Date()).toISOString() }));
      }
      if (alternatives.length < 2) return fail("ADI_ALTERNATIVE_DIVERSITY_INSUFFICIENT", "At least two distinct alternatives, including the baseline, are required.");
      const set = Object.freeze({ alternativeSetId: createId("alternative_set"), frameworkId: framework.data.frameworkId, frameworkVersion: framework.data.version, tenantId: framework.data.tenantId, businessId: framework.data.businessId, decisionId: framework.data.decisionId, alternatives: Object.freeze(alternatives), providerCount: generators.length, status: "generated", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0" });
      sets.set(set.alternativeSetId, set);
      await emit("adi.alternatives.generated", { alternativeSetId: set.alternativeSetId, count: set.alternatives.length }, { tenantId: set.tenantId, businessId: set.businessId, decisionId: set.decisionId });
      return ok(set);
    }
    function get(q) {
      const x = sets.get(q.alternativeSetId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_ALTERNATIVE_SET_NOT_FOUND", "Alternative set was not found inside the requested boundary.");
    }
    return Object.freeze({ blockId: "ADI-13", version: "1.0.0", generate, get, list: (q) => ok([...sets.values()].filter((x) => x.tenantId === q.tenantId && x.businessId === q.businessId && (!q.decisionId || x.decisionId === q.decisionId))) });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const framework = runtime?.getService?.("adi.evaluation_framework");
    if (!framework?.ok) return fail("ADI_ALTERNATIVE_DEPENDENCY_REQUIRED", "ADI-12 must be attached before ADI-13.");
    const engine = createAlternativeGenerationEngine({ ...options, frameworkEngine: framework.data, createId: runtime.createId, emit: runtime.emit });
    let r = runtime.registerService("adi.alternative_generation", engine, { blockId: "ADI-13", version: "1.0.0" });
    if (!r.ok) return r;
    for (const [n, h] of [["adi.alternatives.generate", (q) => engine.generate(q)], ["adi.alternatives.get", (q) => engine.get(q)], ["adi.alternatives.list", (q) => engine.list(q)]]) {
      r = runtime.registerRoute(n, h, { blockId: "ADI-13" });
      if (!r.ok) return r;
    }
    return runtime.success({ blockId: "ADI-13", service: "adi.alternative_generation" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-13"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-14-Alternative-Feasibility-Eligibility-Filter ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-14-Alternative-Feasibility-Eligibility-Filter/src/adi-14-alternative-feasibility-eligibility-filter.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-14-Alternative-Feasibility-Eligibility-Filter/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createFeasibilityFilter: () => createFeasibilityFilter
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function compare(actual, operator, expected) {
    if (actual === void 0) return null;
    switch (operator) {
      case "<=":
        return actual <= expected;
      case ">=":
        return actual >= expected;
      case "=":
        return actual === expected;
      case "<":
        return actual < expected;
      case ">":
        return actual > expected;
      case "in":
        return Array.isArray(expected) && expected.includes(actual);
      case "not_in":
        return Array.isArray(expected) && !expected.includes(actual);
      case "contains":
        return String(actual).includes(String(expected));
      default:
        return null;
    }
  }
  function createFeasibilityFilter(options = {}) {
    const alternativeEngine = options.alternativeEngine, frameworkEngine = options.frameworkEngine;
    const rules = options.rules ?? [];
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => ok(null));
    const reports = /* @__PURE__ */ new Map();
    async function evaluate(input = {}) {
      const set = alternativeEngine?.get({ alternativeSetId: input.alternativeSetId, tenantId: input.tenantId, businessId: input.businessId });
      if (!set?.ok) return fail("ADI_FEASIBILITY_SET_INVALID", "ADI-13 AlternativeSet was not found.");
      const fw = frameworkEngine?.get({ frameworkId: set.data.frameworkId, tenantId: input.tenantId, businessId: input.businessId });
      if (!fw?.ok || fw.data.status !== "locked") return fail("ADI_FEASIBILITY_FRAMEWORK_INVALID", "Locked ADI-12 framework was not found.");
      const results = [];
      for (const alternative of set.data.alternatives) {
        const checks = [];
        for (const constraint of fw.data.constraints) {
          const actual = alternative.attributes?.[constraint.metric] ?? alternative[constraint.metric];
          const passed = compare(actual, constraint.operator, constraint.value);
          checks.push(Object.freeze({ checkId: createId("check"), kind: "constraint", referenceId: constraint.constraintId, hard: constraint.hard === true, passed, actual: actual ?? null, expected: constraint.value, operator: constraint.operator, reason: passed === null ? "evidence_missing" : passed ? "constraint_satisfied" : "constraint_failed" }));
        }
        for (const rule of rules) {
          try {
            const r = await rule.evaluate({ alternative, framework: fw.data });
            checks.push(Object.freeze({ checkId: createId("check"), kind: "eligibility_rule", referenceId: rule.ruleId, hard: rule.hard !== false, passed: r.passed ?? null, actual: r.actual ?? null, expected: r.expected ?? null, operator: r.operator ?? null, reason: r.reason ?? (r.passed ? "rule_satisfied" : "rule_failed") }));
          } catch (error) {
            checks.push(Object.freeze({ checkId: createId("check"), kind: "eligibility_rule", referenceId: rule.ruleId, hard: true, passed: null, reason: "evaluator_failed", message: error.message }));
          }
        }
        const hard = checks.filter((x) => x.hard);
        const status = hard.some((x) => x.passed === false) ? "ineligible" : hard.some((x) => x.passed === null) ? "needs_evidence" : "eligible";
        results.push(Object.freeze({ alternativeId: alternative.alternativeId, status, checks: Object.freeze(checks), failedCheckIds: Object.freeze(checks.filter((x) => x.passed === false).map((x) => x.checkId)), missingCheckIds: Object.freeze(checks.filter((x) => x.passed === null).map((x) => x.checkId)) }));
      }
      const report = Object.freeze({ feasibilityReportId: createId("feasibility"), alternativeSetId: set.data.alternativeSetId, frameworkId: fw.data.frameworkId, tenantId: set.data.tenantId, businessId: set.data.businessId, decisionId: set.data.decisionId, results: Object.freeze(results), summary: Object.freeze({ eligible: results.filter((x) => x.status === "eligible").length, ineligible: results.filter((x) => x.status === "ineligible").length, needsEvidence: results.filter((x) => x.status === "needs_evidence").length }), createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0" });
      reports.set(report.feasibilityReportId, report);
      await emit("adi.alternatives.filtered", report.summary, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = reports.get(q.feasibilityReportId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_FEASIBILITY_REPORT_NOT_FOUND", "Feasibility report was not found.");
    }
    return Object.freeze({ blockId: "ADI-14", version: "1.0.0", evaluate, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const alternatives = runtime?.getService?.("adi.alternative_generation"), framework = runtime?.getService?.("adi.evaluation_framework");
    if (!alternatives?.ok || !framework?.ok) return fail("ADI_FEASIBILITY_DEPENDENCY_REQUIRED", "ADI-12 and ADI-13 must be attached before ADI-14.");
    const engine = createFeasibilityFilter({ ...options, alternativeEngine: alternatives.data, frameworkEngine: framework.data, createId: runtime.createId, emit: runtime.emit });
    let r = runtime.registerService("adi.feasibility_filter", engine, { blockId: "ADI-14", version: "1.0.0" });
    if (!r.ok) return r;
    for (const [n, h] of [["adi.feasibility.evaluate", (q) => engine.evaluate(q)], ["adi.feasibility.get", (q) => engine.get(q)]]) {
      r = runtime.registerRoute(n, h, { blockId: "ADI-14" });
      if (!r.ok) return r;
    }
    return runtime.success({ blockId: "ADI-14", service: "adi.feasibility_filter" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-14"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-15-Impact-Dependency-Trade-off-Analysis-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-15-Impact-Dependency-Trade-off-Analysis-Engine/src/adi-15-impact-dependency-trade-off-analysis-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-15-Impact-Dependency-Trade-off-Analysis-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createImpactAnalysisEngine: () => createImpactAnalysisEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  var directions = /* @__PURE__ */ new Set(["positive", "negative", "neutral", "mixed", "unknown"]);
  function cycles(edges) {
    const graph = /* @__PURE__ */ new Map();
    for (const e of edges) {
      const a = graph.get(e.from) ?? [];
      a.push(e.to);
      graph.set(e.from, a);
    }
    const found = [], visiting = /* @__PURE__ */ new Set(), visited = /* @__PURE__ */ new Set();
    function walk(n, path) {
      if (visiting.has(n)) {
        found.push([...path.slice(path.indexOf(n)), n]);
        return;
      }
      if (visited.has(n)) return;
      visiting.add(n);
      for (const next of graph.get(n) ?? []) walk(next, [...path, next]);
      visiting.delete(n);
      visited.add(n);
    }
    for (const n of graph.keys()) walk(n, [n]);
    return found;
  }
  function createImpactAnalysisEngine(options = {}) {
    const feasibilityFilter = options.feasibilityFilter, alternativeEngine = options.alternativeEngine;
    const assessors = options.assessors ?? [];
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => ok(null));
    const reports = /* @__PURE__ */ new Map();
    async function analyse(input = {}) {
      const feasibility = feasibilityFilter?.get({ feasibilityReportId: input.feasibilityReportId, tenantId: input.tenantId, businessId: input.businessId });
      if (!feasibility?.ok) return fail("ADI_IMPACT_FEASIBILITY_INVALID", "ADI-14 report was not found.");
      const set = alternativeEngine?.get({ alternativeSetId: feasibility.data.alternativeSetId, tenantId: input.tenantId, businessId: input.businessId });
      if (!set?.ok) return fail("ADI_IMPACT_ALTERNATIVES_INVALID", "ADI-13 set was not found.");
      const analysed = [];
      for (const result of feasibility.data.results.filter((x) => x.status !== "ineligible")) {
        const alternative = set.data.alternatives.find((x) => x.alternativeId === result.alternativeId);
        const impacts = [], dependencies = [];
        for (const assessor of assessors) {
          try {
            const output = await assessor.assess({ alternative, feasibility: result, context: input.context ?? null });
            for (const x of output?.impacts ?? []) {
              impacts.push(Object.freeze({ impactId: createId("impact"), dimension: x.dimension ?? assessor.dimension ?? "general", metric: x.metric ?? null, direction: directions.has(x.direction) ? x.direction : "unknown", magnitude: x.magnitude ?? null, unit: x.unit ?? null, timeHorizon: x.timeHorizon ?? null, confidence: x.confidence ?? null, evidenceIds: Object.freeze([...x.evidenceIds ?? []]), assessorId: assessor.assessorId ?? "unknown" }));
            }
            for (const d of output?.dependencies ?? []) dependencies.push(Object.freeze({ from: d.from ?? alternative.alternativeId, to: d.to, type: d.type ?? "requires", description: d.description ?? "", evidenceIds: Object.freeze([...d.evidenceIds ?? []]) }));
          } catch (error) {
            impacts.push(Object.freeze({ impactId: createId("impact"), dimension: assessor.dimension ?? "general", metric: null, direction: "unknown", magnitude: null, unit: null, confidence: 0, evidenceIds: Object.freeze([]), assessorId: assessor.assessorId ?? "unknown", error: error.message }));
          }
        }
        const positive = impacts.filter((x) => x.direction === "positive"), negative = impacts.filter((x) => x.direction === "negative");
        const tradeoffs = [];
        for (const p of positive) for (const n of negative) tradeoffs.push(Object.freeze({ tradeoffId: createId("tradeoff"), benefitImpactId: p.impactId, costImpactId: n.impactId, statement: `Gain in ${p.dimension} is accompanied by a negative ${n.dimension} impact.` }));
        analysed.push(Object.freeze({ alternativeId: alternative.alternativeId, impacts: Object.freeze(impacts), dependencies: Object.freeze(dependencies), dependencyCycles: Object.freeze(cycles(dependencies)), tradeoffs: Object.freeze(tradeoffs), status: impacts.some((x) => x.direction === "unknown") ? "partial" : "assessed" }));
      }
      const report = Object.freeze({ impactReportId: createId("impact_report"), feasibilityReportId: feasibility.data.feasibilityReportId, alternativeSetId: set.data.alternativeSetId, tenantId: set.data.tenantId, businessId: set.data.businessId, decisionId: set.data.decisionId, alternatives: Object.freeze(analysed), createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0" });
      reports.set(report.impactReportId, report);
      await emit("adi.impacts.analysed", { impactReportId: report.impactReportId, count: analysed.length }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = reports.get(q.impactReportId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_IMPACT_REPORT_NOT_FOUND", "Impact report was not found.");
    }
    return Object.freeze({ blockId: "ADI-15", version: "1.0.0", analyse, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const f = runtime?.getService?.("adi.feasibility_filter"), a = runtime?.getService?.("adi.alternative_generation");
    if (!f?.ok || !a?.ok) return fail("ADI_IMPACT_DEPENDENCY_REQUIRED", "ADI-13 and ADI-14 must be attached before ADI-15.");
    const e = createImpactAnalysisEngine({ ...options, feasibilityFilter: f.data, alternativeEngine: a.data, createId: runtime.createId, emit: runtime.emit });
    let r = runtime.registerService("adi.impact_analysis", e, { blockId: "ADI-15", version: "1.0.0" });
    if (!r.ok) return r;
    for (const [n, h] of [["adi.impacts.analyse", (q) => e.analyse(q)], ["adi.impacts.get", (q) => e.get(q)]]) {
      r = runtime.registerRoute(n, h, { blockId: "ADI-15" });
      if (!r.ok) return r;
    }
    return runtime.success({ blockId: "ADI-15", service: "adi.impact_analysis" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-15"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-16-Simulation-Orchestration-Scenario-Comparison-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-16-Simulation-Orchestration-Scenario-Comparison-Engine/src/adi-16-simulation-orchestration-scenario-comparison-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-16-Simulation-Orchestration-Scenario-Comparison-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createSimulationOrchestrator: () => createSimulationOrchestrator
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createSimulationOrchestrator(options = {}) {
    const feasibilityFilter = options.feasibilityFilter, alternativeEngine = options.alternativeEngine, impactEngine = options.impactEngine;
    const executeScenario = options.executeScenario;
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => ok(null));
    const reports = /* @__PURE__ */ new Map();
    async function orchestrate(input = {}) {
      if (typeof executeScenario !== "function") return fail("ADI_SIMULATION_EXECUTOR_REQUIRED", "Existing Simulation Engine orchestration adapter is required.");
      const feasibility = feasibilityFilter?.get({ feasibilityReportId: input.feasibilityReportId, tenantId: input.tenantId, businessId: input.businessId });
      if (!feasibility?.ok) return fail("ADI_SIMULATION_FEASIBILITY_INVALID", "ADI-14 report was not found.");
      const set = alternativeEngine?.get({ alternativeSetId: feasibility.data.alternativeSetId, tenantId: input.tenantId, businessId: input.businessId });
      if (!set?.ok) return fail("ADI_SIMULATION_ALTERNATIVES_INVALID", "ADI-13 set was not found.");
      const eligible = new Set(feasibility.data.results.filter((x) => x.status === "eligible").map((x) => x.alternativeId));
      if (!eligible.size) return fail("ADI_SIMULATION_NO_ELIGIBLE_ALTERNATIVES", "No eligible alternative is available for simulation.");
      const runs = [], failures = [];
      for (const alternative of set.data.alternatives.filter((x) => eligible.has(x.alternativeId))) {
        try {
          const run = await executeScenario(Object.freeze({ alternative: structuredClone(alternative), decisionId: set.data.decisionId, tenantId: set.data.tenantId, businessId: set.data.businessId, simulationPolicy: structuredClone(input.simulationPolicy ?? {}), comparisonMetrics: Object.freeze([...input.comparisonMetrics ?? []]) }));
          const errors = [];
          if (!run?.runId) errors.push("run_id_required");
          if (run?.status !== "completed") errors.push("run_not_completed");
          if (run?.tenantId !== set.data.tenantId || run?.businessId !== set.data.businessId) errors.push("run_boundary_mismatch");
          if (!run?.outputs || typeof run.outputs !== "object") errors.push("outputs_required");
          if (errors.length) {
            failures.push({ alternativeId: alternative.alternativeId, errors });
            continue;
          }
          runs.push(Object.freeze({ alternativeId: alternative.alternativeId, runId: run.runId, status: run.status, engineVersion: run.engineVersion ?? null, modelVersion: run.modelVersion ?? null, sampleSize: run.sampleSize ?? null, completedAt: run.completedAt ?? null, assumptions: Object.freeze(structuredClone(run.assumptions ?? [])), outputs: Object.freeze(structuredClone(run.outputs)), sourceResultRef: run.sourceResultRef ?? null }));
        } catch (error) {
          failures.push({ alternativeId: alternative.alternativeId, errors: ["executor_failed"], message: error.message });
        }
      }
      if (!runs.length) return fail("ADI_SIMULATION_RUNS_INVALID", "No completed simulation run was returned.", { failures });
      const metrics = input.comparisonMetrics ?? [...new Set(runs.flatMap((x) => Object.keys(x.outputs)))];
      const matrix = Object.freeze(metrics.map((metric) => Object.freeze({ metric, values: Object.freeze(runs.map((run) => Object.freeze({ alternativeId: run.alternativeId, runId: run.runId, value: run.outputs[metric] ?? null }))), note: "Recorded values only; no overall ranking." })));
      const report = Object.freeze({ scenarioComparisonId: createId("scenario_comparison"), feasibilityReportId: feasibility.data.feasibilityReportId, impactReportId: input.impactReportId ?? null, alternativeSetId: set.data.alternativeSetId, tenantId: set.data.tenantId, businessId: set.data.businessId, decisionId: set.data.decisionId, runs: Object.freeze(runs), failures: Object.freeze(failures), comparisonMatrix: matrix, status: failures.length ? "partial" : "completed", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0" });
      reports.set(report.scenarioComparisonId, report);
      await emit("adi.scenarios.compared", { scenarioComparisonId: report.scenarioComparisonId, runCount: runs.length, failureCount: failures.length }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report, { partial: failures.length > 0 });
    }
    function get(q) {
      const x = reports.get(q.scenarioComparisonId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_SCENARIO_COMPARISON_NOT_FOUND", "Scenario comparison was not found.");
    }
    return Object.freeze({ blockId: "ADI-16", version: "1.0.0", orchestrate, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const f = runtime?.getService?.("adi.feasibility_filter"), a = runtime?.getService?.("adi.alternative_generation"), i = runtime?.getService?.("adi.impact_analysis");
    if (!f?.ok || !a?.ok || !i?.ok) return fail("ADI_SIMULATION_DEPENDENCY_REQUIRED", "ADI-13 through ADI-15 must be attached before ADI-16.");
    const e = createSimulationOrchestrator({ ...options, feasibilityFilter: f.data, alternativeEngine: a.data, impactEngine: i.data, createId: runtime.createId, emit: runtime.emit });
    let r = runtime.registerService("adi.simulation_orchestration", e, { blockId: "ADI-16", version: "1.0.0" });
    if (!r.ok) return r;
    for (const [n, h] of [["adi.scenarios.orchestrate", (q) => e.orchestrate(q)], ["adi.scenarios.get", (q) => e.get(q)]]) {
      r = runtime.registerRoute(n, h, { blockId: "ADI-16" });
      if (!r.ok) return r;
    }
    return runtime.success({ blockId: "ADI-16", service: "adi.simulation_orchestration" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-16"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-17-Risk-Opportunity-Downside-Assessment-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-17-Risk-Opportunity-Downside-Assessment-Engine/src/adi-17-risk-opportunity-downside-assessment-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-17-Risk-Opportunity-Downside-Assessment-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createRiskAssessmentEngine: () => createRiskAssessmentEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  var clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function createRiskAssessmentEngine(options = {}) {
    const impactEngine = options.impactEngine, scenarioEngine = options.scenarioEngine;
    const assessors = options.assessors ?? [];
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => ok(null));
    const reports = /* @__PURE__ */ new Map();
    async function assess(input = {}) {
      const impacts = impactEngine?.get({ impactReportId: input.impactReportId, tenantId: input.tenantId, businessId: input.businessId });
      const scenarios = scenarioEngine?.get({ scenarioComparisonId: input.scenarioComparisonId, tenantId: input.tenantId, businessId: input.businessId });
      if (!impacts?.ok || !scenarios?.ok) return fail("ADI_RISK_INPUT_INVALID", "ADI-15 impact report and ADI-16 scenario comparison are required.");
      const altIds = [.../* @__PURE__ */ new Set([...impacts.data.alternatives.map((x) => x.alternativeId), ...scenarios.data.runs.map((x) => x.alternativeId)])];
      const alternatives = [];
      for (const alternativeId of altIds) {
        const findings = [];
        for (const assessor of assessors) {
          try {
            for (const f of await assessor.assess({ alternativeId, impacts: impacts.data.alternatives.find((x) => x.alternativeId === alternativeId) ?? null, run: scenarios.data.runs.find((x) => x.alternativeId === alternativeId) ?? null }) ?? []) {
              const probability = Number.isFinite(Number(f.probability)) ? clamp(Number(f.probability), 0, 1) : null;
              const impact = Number.isFinite(Number(f.impact)) ? clamp(Number(f.impact), 1, 5) : null;
              findings.push(Object.freeze({ findingId: createId("risk_finding"), type: f.type === "opportunity" ? "opportunity" : "risk", category: f.category ?? "general", title: f.title ?? "Untitled finding", description: f.description ?? "", probability, impact, exposure: probability !== null && impact !== null ? Math.round(probability * impact * 1e3) / 1e3 : null, timeHorizon: f.timeHorizon ?? null, evidenceIds: Object.freeze([...f.evidenceIds ?? []]), runIds: Object.freeze([...f.runIds ?? []]), controls: Object.freeze(structuredClone(f.controls ?? [])), assessorId: assessor.assessorId ?? "unknown", assessorVersion: assessor.version ?? null }));
            }
          } catch (error) {
            findings.push(Object.freeze({ findingId: createId("risk_finding"), type: "risk", category: "assessment", title: "Assessment unavailable", description: error.message, probability: null, impact: null, exposure: null, evidenceIds: Object.freeze([]), runIds: Object.freeze([]), controls: Object.freeze([]), assessorId: assessor.assessorId ?? "unknown" }));
          }
        }
        const risks = findings.filter((x) => x.type === "risk"), opportunities = findings.filter((x) => x.type === "opportunity");
        alternatives.push(Object.freeze({ alternativeId, findings: Object.freeze(findings), riskCount: risks.length, opportunityCount: opportunities.length, criticalRiskIds: Object.freeze(risks.filter((x) => x.exposure !== null && x.exposure >= 3.5).map((x) => x.findingId)), unquantifiedRiskIds: Object.freeze(risks.filter((x) => x.exposure === null).map((x) => x.findingId)), maximumExposure: risks.reduce((m, x) => Math.max(m, x.exposure ?? 0), 0), downsideStatus: risks.some((x) => (x.exposure ?? 0) >= 3.5) ? "critical" : risks.length ? "present" : "none" }));
      }
      const report = Object.freeze({ riskAssessmentId: createId("risk_assessment"), impactReportId: impacts.data.impactReportId, scenarioComparisonId: scenarios.data.scenarioComparisonId, tenantId: impacts.data.tenantId, businessId: impacts.data.businessId, decisionId: impacts.data.decisionId, alternatives: Object.freeze(alternatives), status: alternatives.some((x) => x.unquantifiedRiskIds.length) ? "partial" : "completed", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0" });
      reports.set(report.riskAssessmentId, report);
      await emit("adi.risk.assessed", { riskAssessmentId: report.riskAssessmentId, status: report.status }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = reports.get(q.riskAssessmentId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_RISK_ASSESSMENT_NOT_FOUND", "Risk assessment was not found.");
    }
    return Object.freeze({ blockId: "ADI-17", version: "1.0.0", assess, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const i = runtime?.getService?.("adi.impact_analysis"), s = runtime?.getService?.("adi.simulation_orchestration");
    if (!i?.ok || !s?.ok) return fail("ADI_RISK_DEPENDENCY_REQUIRED", "ADI-15 and ADI-16 must be attached before ADI-17.");
    const e = createRiskAssessmentEngine({ ...options, impactEngine: i.data, scenarioEngine: s.data, createId: runtime.createId, emit: runtime.emit });
    let r = runtime.registerService("adi.risk_assessment", e, { blockId: "ADI-17", version: "1.0.0" });
    if (!r.ok) return r;
    for (const [n, h] of [["adi.risk.assess", (q) => e.assess(q)], ["adi.risk.get", (q) => e.get(q)]]) {
      r = runtime.registerRoute(n, h, { blockId: "ADI-17" });
      if (!r.ok) return r;
    }
    return runtime.success({ blockId: "ADI-17", service: "adi.risk_assessment" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-17"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine/src/adi-18-multi-criteria-decision-scoring-ranking-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createScoringEngine: () => createScoringEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  var clamp = (x) => Math.max(0, Math.min(100, Number(x)));
  function createScoringEngine(options = {}) {
    const frameworkEngine = options.frameworkEngine, feasibilityFilter = options.feasibilityFilter, alternativeEngine = options.alternativeEngine, riskEngine = options.riskEngine;
    const evaluators = options.evaluators ?? [];
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => ok(null));
    const rankings = /* @__PURE__ */ new Map();
    async function score(input = {}) {
      const fw = frameworkEngine?.get({ frameworkId: input.frameworkId, tenantId: input.tenantId, businessId: input.businessId });
      const feas = feasibilityFilter?.get({ feasibilityReportId: input.feasibilityReportId, tenantId: input.tenantId, businessId: input.businessId });
      if (!fw?.ok || fw.data.status !== "locked" || !feas?.ok) return fail("ADI_SCORING_INPUT_INVALID", "Locked framework and feasibility report are required.");
      const set = alternativeEngine?.get({ alternativeSetId: feas.data.alternativeSetId, tenantId: input.tenantId, businessId: input.businessId });
      if (!set?.ok) return fail("ADI_SCORING_ALTERNATIVES_INVALID", "Alternative set was not found.");
      const rows = [];
      for (const alt of set.data.alternatives) {
        const eligibility = feas.data.results.find((x) => x.alternativeId === alt.alternativeId);
        if (eligibility?.status !== "eligible") {
          rows.push(Object.freeze({ alternativeId: alt.alternativeId, eligibilityStatus: eligibility?.status ?? "unknown", criterionScores: Object.freeze([]), totalScore: null, coverage: 0, rank: null }));
          continue;
        }
        const scores = [];
        for (const criterion of fw.data.criteria) {
          let result = null;
          for (const evaluator of evaluators) {
            if (evaluator.supports && !evaluator.supports(criterion, alt)) continue;
            try {
              result = await evaluator.score({ alternative: alt, criterion, inputs: input.inputs ?? {} });
              if (result) break;
            } catch {
            }
          }
          if (!result || !Number.isFinite(Number(result.score))) {
            scores.push(Object.freeze({ criterionId: criterion.criterionId, score: null, normalizedWeight: criterion.normalizedWeight, weightedContribution: null, evaluatorId: null, evidenceIds: Object.freeze([]), reason: "score_missing" }));
            continue;
          }
          const value = clamp(result.score);
          scores.push(Object.freeze({ criterionId: criterion.criterionId, score: value, normalizedWeight: criterion.normalizedWeight, weightedContribution: Math.round(value * criterion.normalizedWeight * 1e4) / 1e4, evaluatorId: result.evaluatorId ?? "unknown", evidenceIds: Object.freeze([...result.evidenceIds ?? []]), reason: result.reason ?? null }));
        }
        const available = scores.filter((x) => x.score !== null);
        const weightCovered = available.reduce((s, x) => s + x.normalizedWeight, 0);
        const total = weightCovered ? available.reduce((s, x) => s + x.weightedContribution, 0) / weightCovered : null;
        rows.push(Object.freeze({ alternativeId: alt.alternativeId, eligibilityStatus: "eligible", criterionScores: Object.freeze(scores), totalScore: total === null ? null : Math.round(total * 1e4) / 1e4, coverage: Math.round(weightCovered * 1e4) / 1e4, rank: null }));
      }
      const ranked = rows.filter((x) => x.totalScore !== null).sort((a, b) => b.totalScore - a.totalScore);
      let last = null, rank = 0;
      const ranks = /* @__PURE__ */ new Map();
      ranked.forEach((x, i) => {
        if (last === null || x.totalScore < last) rank = i + 1;
        ranks.set(x.alternativeId, rank);
        last = x.totalScore;
      });
      const finalRows = rows.map((x) => {
        const assignedRank = ranks.get(x.alternativeId) ?? null;
        return Object.freeze({ ...x, rank: assignedRank, tiedWith: Object.freeze(assignedRank === null ? [] : ranked.filter((y) => y.alternativeId !== x.alternativeId && ranks.get(y.alternativeId) === assignedRank).map((y) => y.alternativeId)) });
      });
      const report = Object.freeze({ rankingId: createId("ranking"), frameworkId: fw.data.frameworkId, feasibilityReportId: feas.data.feasibilityReportId, riskAssessmentId: input.riskAssessmentId ?? null, tenantId: set.data.tenantId, businessId: set.data.businessId, decisionId: set.data.decisionId, rows: Object.freeze(finalRows), method: "weighted_normalized_sum", status: finalRows.some((x) => x.eligibilityStatus === "eligible" && x.coverage < 1) ? "partial" : "completed", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Analytical ranking only; not a recommendation or approval." });
      rankings.set(report.rankingId, report);
      await emit("adi.alternatives.ranked", { rankingId: report.rankingId, status: report.status }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = rankings.get(q.rankingId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_RANKING_NOT_FOUND", "Ranking was not found.");
    }
    return Object.freeze({ blockId: "ADI-18", version: "1.0.0", score, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const f = runtime?.getService?.("adi.evaluation_framework"), e = runtime?.getService?.("adi.feasibility_filter"), a = runtime?.getService?.("adi.alternative_generation"), r = runtime?.getService?.("adi.risk_assessment");
    if (!f?.ok || !e?.ok || !a?.ok || !r?.ok) return fail("ADI_SCORING_DEPENDENCY_REQUIRED", "ADI-12, ADI-14, ADI-17 and alternative service are required.");
    const engine = createScoringEngine({ ...options, frameworkEngine: f.data, feasibilityFilter: e.data, alternativeEngine: a.data, riskEngine: r.data, createId: runtime.createId, emit: runtime.emit });
    let x = runtime.registerService("adi.scoring_ranking", engine, { blockId: "ADI-18", version: "1.0.0" });
    if (!x.ok) return x;
    for (const [n, h] of [["adi.ranking.score", (q) => engine.score(q)], ["adi.ranking.get", (q) => engine.get(q)]]) {
      x = runtime.registerRoute(n, h, { blockId: "ADI-18" });
      if (!x.ok) return x;
    }
    return runtime.success({ blockId: "ADI-18", service: "adi.scoring_ranking" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-18"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-19-Uncertainty-Confidence-Calibration-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-19-Uncertainty-Confidence-Calibration-Engine/src/adi-19-uncertainty-confidence-calibration-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-19-Uncertainty-Confidence-Calibration-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createConfidenceCalibrationEngine: () => createConfidenceCalibrationEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  var clamp = (x) => Math.max(0, Math.min(1, Number(x)));
  var round = (x) => Math.round(x * 1e4) / 1e4;
  function createConfidenceCalibrationEngine(options = {}) {
    const rankingEngine = options.rankingEngine, scenarioEngine = options.scenarioEngine, riskEngine = options.riskEngine;
    const calibrator = options.calibrator ?? null, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const reports = /* @__PURE__ */ new Map();
    async function assess(input = {}) {
      const ranking = rankingEngine?.get({ rankingId: input.rankingId, tenantId: input.tenantId, businessId: input.businessId });
      const scenarios = scenarioEngine?.get({ scenarioComparisonId: input.scenarioComparisonId, tenantId: input.tenantId, businessId: input.businessId });
      const risks = riskEngine?.get({ riskAssessmentId: input.riskAssessmentId, tenantId: input.tenantId, businessId: input.businessId });
      if (!ranking?.ok || !scenarios?.ok || !risks?.ok) return fail("ADI_CONFIDENCE_INPUT_INVALID", "Ranking, scenario comparison and risk assessment are required.");
      const alternatives = [];
      for (const row of ranking.data.rows.filter((x) => x.eligibilityStatus === "eligible")) {
        const run = scenarios.data.runs.find((x) => x.alternativeId === row.alternativeId);
        const risk = risks.data.alternatives.find((x) => x.alternativeId === row.alternativeId);
        const totalFindings = risk?.findings?.length ?? 0;
        const quantified = totalFindings ? risk.findings.filter((x) => x.exposure !== null).length / totalFindings : 1;
        const stabilityInput = input.stabilityByAlternative?.[row.alternativeId];
        const stability = Number.isFinite(Number(stabilityInput)) ? clamp(stabilityInput) : 0;
        const components = Object.freeze({ criterionCoverage: clamp(row.coverage ?? 0), simulationCoverage: run?.status === "completed" ? 1 : 0, riskQuantification: clamp(quantified), sensitivityStability: stability });
        const raw = round(0.35 * components.criterionCoverage + 0.25 * components.simulationCoverage + 0.2 * components.riskQuantification + 0.2 * components.sensitivityStability);
        let calibrated = raw, calibrationVersion = null, uncalibrated = true;
        if (calibrator?.calibrate) {
          const result = await calibrator.calibrate({ rawConfidence: raw, alternativeId: row.alternativeId, components });
          if (!Number.isFinite(Number(result?.calibratedConfidence)) || !result?.version) return fail("ADI_CALIBRATION_INVALID", "Calibrator must return calibratedConfidence and version.");
          calibrated = round(clamp(result.calibratedConfidence));
          calibrationVersion = String(result.version);
          uncalibrated = false;
        }
        const missing = [];
        if (components.criterionCoverage < 1) missing.push("criterion_coverage");
        if (!components.simulationCoverage) missing.push("simulation");
        if (components.riskQuantification < 1) missing.push("risk_quantification");
        if (stabilityInput === void 0) missing.push("sensitivity_stability");
        alternatives.push(Object.freeze({ alternativeId: row.alternativeId, components, rawConfidence: raw, calibratedConfidence: calibrated, confidenceBand: calibrated >= 0.75 ? "high" : calibrated >= 0.5 ? "medium" : "low", calibrationVersion, uncalibrated, missingFactors: Object.freeze(missing) }));
      }
      const report = Object.freeze({ confidenceReportId: createId("confidence_report"), rankingId: ranking.data.rankingId, scenarioComparisonId: scenarios.data.scenarioComparisonId, riskAssessmentId: risks.data.riskAssessmentId, tenantId: ranking.data.tenantId, businessId: ranking.data.businessId, decisionId: ranking.data.decisionId, alternatives: Object.freeze(alternatives), formula: Object.freeze({ criterionCoverage: 0.35, simulationCoverage: 0.25, riskQuantification: 0.2, sensitivityStability: 0.2 }), status: alternatives.some((x) => x.missingFactors.length) ? "partial" : "completed", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Confidence qualifies analytical support; it does not change rank or constitute approval." });
      reports.set(report.confidenceReportId, report);
      await emit("adi.confidence.assessed", { confidenceReportId: report.confidenceReportId, status: report.status }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = reports.get(q.confidenceReportId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_CONFIDENCE_REPORT_NOT_FOUND", "Confidence report was not found.");
    }
    return Object.freeze({ blockId: "ADI-19", version: "1.0.0", assess, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const r = runtime?.getService?.("adi.scoring_ranking"), s = runtime?.getService?.("adi.simulation_orchestration"), k = runtime?.getService?.("adi.risk_assessment");
    if (!r?.ok || !s?.ok || !k?.ok) return fail("ADI_CONFIDENCE_DEPENDENCY_REQUIRED", "ADI-16, ADI-17 and ADI-18 must be attached before ADI-19.");
    const e = createConfidenceCalibrationEngine({ ...options, rankingEngine: r.data, scenarioEngine: s.data, riskEngine: k.data, createId: runtime.createId, emit: runtime.emit });
    let x = runtime.registerService("adi.confidence_calibration", e, { blockId: "ADI-19", version: "1.0.0" });
    if (!x.ok) return x;
    for (const [n, h] of [["adi.confidence.assess", (q) => e.assess(q)], ["adi.confidence.get", (q) => e.get(q)]]) {
      x = runtime.registerRoute(n, h, { blockId: "ADI-19" });
      if (!x.ok) return x;
    }
    return runtime.success({ blockId: "ADI-19", service: "adi.confidence_calibration" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-19"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-20-Explainability-Evidence-Trace-Reasoning-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-20-Explainability-Evidence-Trace-Reasoning-Engine/src/adi-20-explainability-evidence-trace-reasoning-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-20-Explainability-Evidence-Trace-Reasoning-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createExplainabilityEngine: () => createExplainabilityEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createExplainabilityEngine(options = {}) {
    const rankingEngine = options.rankingEngine, confidenceEngine = options.confidenceEngine, riskEngine = options.riskEngine, summarizer = options.summarizer ?? null, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const bundles = /* @__PURE__ */ new Map();
    async function create(input = {}) {
      const ranking = rankingEngine?.get({ rankingId: input.rankingId, tenantId: input.tenantId, businessId: input.businessId });
      const confidence = confidenceEngine?.get({ confidenceReportId: input.confidenceReportId, tenantId: input.tenantId, businessId: input.businessId });
      const risk = riskEngine?.get({ riskAssessmentId: input.riskAssessmentId, tenantId: input.tenantId, businessId: input.businessId });
      if (!ranking?.ok || !confidence?.ok || !risk?.ok) return fail("ADI_EXPLANATION_INPUT_INVALID", "Ranking, confidence and risk reports are required.");
      const ordered = ranking.data.rows.filter((x) => x.rank !== null).sort((a, b) => a.rank - b.rank);
      const leader = ordered[0] ?? null;
      const claims = [];
      for (const row of ordered) {
        claims.push(Object.freeze({ claimId: createId("claim"), type: "ranking", statement: `Alternative ${row.alternativeId} has analytical rank ${row.rank} with score ${row.totalScore}.`, sourceRefs: Object.freeze([ranking.data.rankingId]), evidenceIds: Object.freeze(row.criterionScores.flatMap((x) => x.evidenceIds ?? [])) }));
      }
      for (const c of confidence.data.alternatives) {
        claims.push(Object.freeze({ claimId: createId("claim"), type: "confidence", statement: `Alternative ${c.alternativeId} has ${c.confidenceBand} confidence (${c.calibratedConfidence}).`, sourceRefs: Object.freeze([confidence.data.confidenceReportId]), evidenceIds: Object.freeze([]) }));
      }
      const whyNot = leader ? ordered.slice(1).map((row) => Object.freeze({ alternativeId: row.alternativeId, comparedWith: leader.alternativeId, scoreDelta: Math.round((leader.totalScore - row.totalScore) * 1e4) / 1e4, lowerContributors: Object.freeze(row.criterionScores.filter((x) => x.score !== null).sort((a, b) => a.weightedContribution - b.weightedContribution).slice(0, 3).map((x) => x.criterionId)) })) : [];
      const riskTrace = risk.data.alternatives.flatMap((a) => a.findings.map((f) => Object.freeze({ alternativeId: a.alternativeId, findingId: f.findingId, title: f.title, type: f.type, exposure: f.exposure, evidenceIds: Object.freeze([...f.evidenceIds ?? []]), sourceRef: risk.data.riskAssessmentId })));
      const limitations = [...input.limitations ?? []];
      for (const c of confidence.data.alternatives) for (const item of c.missingFactors ?? []) limitations.push(`Missing ${item} for ${c.alternativeId}.`);
      const structuredFacts = { leaderAlternativeId: leader?.alternativeId ?? null, claims, whyNot, riskTrace, limitations };
      let summary = leader ? `The current analytical leader is ${leader.alternativeId}; see claims, confidence and limitations for qualification.` : "No eligible ranked alternative is available.";
      if (summarizer?.summarize) {
        const s = await summarizer.summarize(structuredFacts);
        if (typeof s !== "string" || !s.trim()) return fail("ADI_EXPLANATION_SUMMARY_INVALID", "Summarizer must return a non-empty string.");
        summary = s.trim();
      }
      const bundle = Object.freeze({ explanationId: createId("explanation"), tenantId: ranking.data.tenantId, businessId: ranking.data.businessId, decisionId: ranking.data.decisionId, rankingId: ranking.data.rankingId, confidenceReportId: confidence.data.confidenceReportId, riskAssessmentId: risk.data.riskAssessmentId, explanationType: "decision_rationale_not_chain_of_thought", summary, claims: Object.freeze(claims), whyNot: Object.freeze(whyNot), riskTrace: Object.freeze(riskTrace), limitations: Object.freeze([...new Set(limitations)]), assumptions: Object.freeze([...input.assumptions ?? []]), createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Recorded rationale only; not private chain-of-thought, a recommendation or an approval." });
      bundles.set(bundle.explanationId, bundle);
      await emit("adi.explanation.created", { explanationId: bundle.explanationId }, { tenantId: bundle.tenantId, businessId: bundle.businessId, decisionId: bundle.decisionId });
      return ok(bundle);
    }
    function get(q) {
      const x = bundles.get(q.explanationId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_EXPLANATION_NOT_FOUND", "Explanation was not found.");
    }
    return Object.freeze({ blockId: "ADI-20", version: "1.0.0", create, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const r = runtime?.getService?.("adi.scoring_ranking"), c = runtime?.getService?.("adi.confidence_calibration"), k = runtime?.getService?.("adi.risk_assessment");
    if (!r?.ok || !c?.ok || !k?.ok) return fail("ADI_EXPLANATION_DEPENDENCY_REQUIRED", "ADI-17, ADI-18 and ADI-19 must be attached before ADI-20.");
    const e = createExplainabilityEngine({ ...options, rankingEngine: r.data, confidenceEngine: c.data, riskEngine: k.data, createId: runtime.createId, emit: runtime.emit });
    let x = runtime.registerService("adi.explainability", e, { blockId: "ADI-20", version: "1.0.0" });
    if (!x.ok) return x;
    for (const [n, h] of [["adi.explanation.create", (q) => e.create(q)], ["adi.explanation.get", (q) => e.get(q)]]) {
      x = runtime.registerRoute(n, h, { blockId: "ADI-20" });
      if (!x.ok) return x;
    }
    return runtime.success({ blockId: "ADI-20", service: "adi.explainability" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-20"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-21-Next-Best-Action-Recommendation-Generation-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-21-Next-Best-Action-Recommendation-Generation-Engine/src/adi-21-next-best-action-recommendation-generation-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-21-Next-Best-Action-Recommendation-Generation-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createRecommendationEngine: () => createRecommendationEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createRecommendationEngine(options = {}) {
    const rankingEngine = options.rankingEngine, confidenceEngine = options.confidenceEngine, riskEngine = options.riskEngine, explainabilityEngine = options.explainabilityEngine, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const minimumConfidence = Number(options.policy?.minimumConfidence ?? 0.65);
    const proposals = /* @__PURE__ */ new Map();
    async function propose(input = {}) {
      const ranking = rankingEngine?.get({ rankingId: input.rankingId, tenantId: input.tenantId, businessId: input.businessId }), confidence = confidenceEngine?.get({ confidenceReportId: input.confidenceReportId, tenantId: input.tenantId, businessId: input.businessId }), risk = riskEngine?.get({ riskAssessmentId: input.riskAssessmentId, tenantId: input.tenantId, businessId: input.businessId }), explanation = explainabilityEngine?.get({ explanationId: input.explanationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!ranking?.ok || !confidence?.ok || !risk?.ok || !explanation?.ok) return fail("ADI_RECOMMENDATION_INPUT_INVALID", "Ranking, confidence, risk and explanation reports are required.");
      const ordered = ranking.data.rows.filter((x) => x.rank !== null && x.eligibilityStatus === "eligible").sort((a, b) => a.rank - b.rank), leader = ordered[0] ?? null;
      const conf = confidence.data.alternatives.find((x) => x.alternativeId === leader?.alternativeId), downside = risk.data.alternatives.find((x) => x.alternativeId === leader?.alternativeId);
      const conditions = [...input.conditions ?? []], withholding = [];
      if (!leader) withholding.push("no_eligible_ranked_alternative");
      if (!conf || conf.calibratedConfidence < minimumConfidence) withholding.push("confidence_below_policy");
      if (downside?.criticalRiskIds?.length && !conditions.some((x) => x.type === "critical_risk_control")) withholding.push("uncontrolled_critical_risk");
      if (downside?.unquantifiedRiskIds?.length && !conditions.some((x) => x.type === "risk_quantification")) withholding.push("unquantified_risk");
      const selected = withholding.length ? null : leader?.alternativeId ?? null;
      const proposal = Object.freeze({ recommendationId: createId("recommendation"), tenantId: ranking.data.tenantId, businessId: ranking.data.businessId, decisionId: ranking.data.decisionId, rankingId: ranking.data.rankingId, confidenceReportId: confidence.data.confidenceReportId, riskAssessmentId: risk.data.riskAssessmentId, explanationId: explanation.data.explanationId, recommendedAlternativeId: selected, fallbackAlternativeIds: Object.freeze(ordered.filter((x) => x.alternativeId !== selected).slice(0, 3).map((x) => x.alternativeId)), analyticalLeaderId: leader?.alternativeId ?? null, leaderConfidence: conf?.calibratedConfidence ?? null, policy: Object.freeze({ minimumConfidence }), conditions: Object.freeze(structuredClone(conditions)), withholdingReasons: Object.freeze(withholding), nextBestAction: selected ? Object.freeze({ type: "submit_for_challenge", targetAlternativeId: selected }) : Object.freeze({ type: "resolve_analytical_gaps", reasons: Object.freeze(withholding) }), monitoringRequirements: Object.freeze(structuredClone(input.monitoringRequirements ?? [])), status: selected ? "proposed" : "withheld", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Recommendation proposal only; no business action is approved or executed." });
      proposals.set(proposal.recommendationId, proposal);
      await emit("adi.recommendation.proposed", { recommendationId: proposal.recommendationId, status: proposal.status }, { tenantId: proposal.tenantId, businessId: proposal.businessId, decisionId: proposal.decisionId });
      return ok(proposal);
    }
    function get(q) {
      const x = proposals.get(q.recommendationId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_RECOMMENDATION_NOT_FOUND", "Recommendation was not found.");
    }
    return Object.freeze({ blockId: "ADI-21", version: "1.0.0", propose, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const r = runtime?.getService?.("adi.scoring_ranking"), c = runtime?.getService?.("adi.confidence_calibration"), k = runtime?.getService?.("adi.risk_assessment"), e = runtime?.getService?.("adi.explainability");
    if (!r?.ok || !c?.ok || !k?.ok || !e?.ok) return fail("ADI_RECOMMENDATION_DEPENDENCY_REQUIRED", "ADI-17 through ADI-20 must be attached before ADI-21.");
    const x = createRecommendationEngine({ ...options, rankingEngine: r.data, confidenceEngine: c.data, riskEngine: k.data, explainabilityEngine: e.data, createId: runtime.createId, emit: runtime.emit });
    let y = runtime.registerService("adi.recommendation_generation", x, { blockId: "ADI-21", version: "1.0.0" });
    if (!y.ok) return y;
    for (const [n, h] of [["adi.recommendation.propose", (q) => x.propose(q)], ["adi.recommendation.get", (q) => x.get(q)]]) {
      y = runtime.registerRoute(n, h, { blockId: "ADI-21" });
      if (!y.ok) return y;
    }
    return runtime.success({ blockId: "ADI-21", service: "adi.recommendation_generation" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-21"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-22-Recommendation-Challenge-Red-Team-Validation-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-22-Recommendation-Challenge-Red-Team-Validation-Engine/src/adi-22-recommendation-challenge-red-team-validation-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-22-Recommendation-Challenge-Red-Team-Validation-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createRedTeamEngine: () => createRedTeamEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createRedTeamEngine(options = {}) {
    const recommendationEngine = options.recommendationEngine, rankingEngine = options.rankingEngine, explainabilityEngine = options.explainabilityEngine, challengers = options.challengers ?? [], createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const reports = /* @__PURE__ */ new Map();
    async function challenge(input = {}) {
      const rec = recommendationEngine?.get({ recommendationId: input.recommendationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!rec?.ok) return fail("ADI_REDTEAM_RECOMMENDATION_INVALID", "Recommendation is required.");
      const snapshot = JSON.stringify(rec.data), ranking = rankingEngine?.get({ rankingId: rec.data.rankingId, tenantId: input.tenantId, businessId: input.businessId }), explanation = explainabilityEngine?.get({ explanationId: rec.data.explanationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!ranking?.ok || !explanation?.ok) return fail("ADI_REDTEAM_EVIDENCE_INVALID", "Ranking and explanation are required.");
      const findings = [];
      if (rec.data.status !== "proposed" || !rec.data.recommendedAlternativeId) findings.push({ severity: "blocker", code: "NO_ACTIONABLE_RECOMMENDATION", message: "There is no qualified recommendation to challenge." });
      const leader = ranking.data.rows.find((x) => x.rank === 1);
      if (leader?.tiedWith?.length) findings.push({ severity: "high", code: "LEADER_TIED", message: "The analytical leader is tied." });
      if ((leader?.coverage ?? 1) < 1) findings.push({ severity: "high", code: "INCOMPLETE_SCORE_COVERAGE", message: "Leader score coverage is incomplete." });
      if (!explanation.data.claims?.length) findings.push({ severity: "blocker", code: "MISSING_EXPLANATION_TRACE", message: "No structured explanation claims are present." });
      for (const challenger of challengers) {
        try {
          for (const f of await challenger.challenge({ recommendation: structuredClone(rec.data), ranking: ranking.data, explanation: explanation.data }) ?? []) findings.push({ severity: ["blocker", "high", "medium", "low"].includes(f.severity) ? f.severity : "medium", code: f.code ?? "EXTERNAL_CHALLENGE", message: f.message ?? "Challenge finding", evidenceRefs: [...f.evidenceRefs ?? []], challengerId: challenger.challengerId ?? "unknown" });
        } catch (error) {
          findings.push({ severity: "high", code: "CHALLENGER_FAILED", message: error.message, challengerId: challenger.challengerId ?? "unknown" });
        }
      }
      if (JSON.stringify(rec.data) !== snapshot) return fail("ADI_REDTEAM_MUTATION_DETECTED", "Source recommendation was mutated by a challenger.");
      const disposition = findings.some((x) => x.severity === "blocker") ? "failed" : findings.some((x) => x.severity === "high") ? "passed_with_conditions" : "passed";
      const report = Object.freeze({ redTeamReportId: createId("redteam_report"), recommendationId: rec.data.recommendationId, tenantId: rec.data.tenantId, businessId: rec.data.businessId, decisionId: rec.data.decisionId, findings: Object.freeze(findings.map(Object.freeze)), disposition, challengerCount: challengers.length, createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Independent challenge record; not an approval or execution instruction." });
      reports.set(report.redTeamReportId, report);
      await emit("adi.recommendation.challenged", { redTeamReportId: report.redTeamReportId, disposition }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = reports.get(q.redTeamReportId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_REDTEAM_REPORT_NOT_FOUND", "Red-team report was not found.");
    }
    return Object.freeze({ blockId: "ADI-22", version: "1.0.0", challenge, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const a = runtime?.getService?.("adi.recommendation_generation"), r = runtime?.getService?.("adi.scoring_ranking"), e = runtime?.getService?.("adi.explainability");
    if (!a?.ok || !r?.ok || !e?.ok) return fail("ADI_REDTEAM_DEPENDENCY_REQUIRED", "ADI-18, ADI-20 and ADI-21 must be attached before ADI-22.");
    const x = createRedTeamEngine({ ...options, recommendationEngine: a.data, rankingEngine: r.data, explainabilityEngine: e.data, createId: runtime.createId, emit: runtime.emit });
    let y = runtime.registerService("adi.red_team_validation", x, { blockId: "ADI-22", version: "1.0.0" });
    if (!y.ok) return y;
    for (const [n, h] of [["adi.redteam.challenge", (q) => x.challenge(q)], ["adi.redteam.get", (q) => x.get(q)]]) {
      y = runtime.registerRoute(n, h, { blockId: "ADI-22" });
      if (!y.ok) return y;
    }
    return runtime.success({ blockId: "ADI-22", service: "adi.red_team_validation" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-22"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-23-Decision-Gate-Escalation-Human-Review-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-23-Decision-Gate-Escalation-Human-Review-Engine/src/adi-23-decision-gate-escalation-human-review-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-23-Decision-Gate-Escalation-Human-Review-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createDecisionGateEngine: () => createDecisionGateEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createDecisionGateEngine(options = {}) {
    const recommendationEngine = options.recommendationEngine, redTeamEngine = options.redTeamEngine, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const gates = /* @__PURE__ */ new Map();
    async function submit(input = {}) {
      const rec = recommendationEngine?.get({ recommendationId: input.recommendationId, tenantId: input.tenantId, businessId: input.businessId }), red = redTeamEngine?.get({ redTeamReportId: input.redTeamReportId, tenantId: input.tenantId, businessId: input.businessId });
      if (!rec?.ok || !red?.ok || red.data.recommendationId !== rec.data.recommendationId) return fail("ADI_GATE_INPUT_INVALID", "Matching recommendation and red-team report are required.");
      if (rec.data.status !== "proposed") return fail("ADI_GATE_RECOMMENDATION_NOT_ACTIONABLE", "Only proposed recommendations may enter review.");
      const gate = Object.freeze({ gateId: createId("decision_gate"), recommendationId: rec.data.recommendationId, redTeamReportId: red.data.redTeamReportId, tenantId: rec.data.tenantId, businessId: rec.data.businessId, decisionId: rec.data.decisionId, status: red.data.disposition === "failed" ? "escalated" : "pending_review", submittedBy: input.submittedBy ?? "system", submittedAt: (/* @__PURE__ */ new Date()).toISOString(), reviews: Object.freeze([]), schemaVersion: "1.0.0" });
      gates.set(gate.gateId, gate);
      await emit("adi.gate.submitted", { gateId: gate.gateId, status: gate.status }, { tenantId: gate.tenantId, businessId: gate.businessId, decisionId: gate.decisionId });
      return ok(gate);
    }
    async function review(input = {}) {
      const gate = gates.get(input.gateId);
      if (!gate || gate.tenantId !== input.tenantId || gate.businessId !== input.businessId) return fail("ADI_GATE_NOT_FOUND", "Decision gate was not found.");
      if (!input.reviewerId || !input.reviewerRole || !String(input.assertion ?? "").trim()) return fail("ADI_GATE_REVIEW_IDENTITY_REQUIRED", "Reviewer ID, role and assertion are required.");
      const allowed = /* @__PURE__ */ new Set(["endorse_for_aba", "return_for_revision", "escalate", "reject_recommendation"]);
      if (!allowed.has(input.decision)) return fail("ADI_GATE_REVIEW_DECISION_INVALID", "Unsupported review decision.");
      const red = redTeamEngine.get({ redTeamReportId: gate.redTeamReportId, tenantId: gate.tenantId, businessId: gate.businessId });
      if (input.decision === "endorse_for_aba" && red.data.disposition === "failed") return fail("ADI_GATE_BLOCKERS_UNRESOLVED", "A failed red-team report cannot be endorsed.");
      const status = { endorse_for_aba: "endorsed_for_aba", return_for_revision: "returned_for_revision", escalate: "escalated", reject_recommendation: "rejected_recommendation" }[input.decision];
      const record = Object.freeze({ reviewId: createId("gate_review"), reviewerId: String(input.reviewerId), reviewerRole: String(input.reviewerRole), decision: input.decision, assertion: String(input.assertion).trim(), conditions: Object.freeze(structuredClone(input.conditions ?? [])), reviewedAt: input.reviewedAt ?? (/* @__PURE__ */ new Date()).toISOString(), signatureRef: input.signatureRef ?? null });
      const updated = Object.freeze({ ...gate, status, reviews: Object.freeze([...gate.reviews, record]), lastReviewedAt: record.reviewedAt });
      gates.set(gate.gateId, updated);
      await emit("adi.gate.reviewed", { gateId: gate.gateId, reviewId: record.reviewId, status }, { tenantId: gate.tenantId, businessId: gate.businessId, decisionId: gate.decisionId });
      return ok(updated);
    }
    function get(q) {
      const x = gates.get(q.gateId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_GATE_NOT_FOUND", "Decision gate was not found.");
    }
    return Object.freeze({ blockId: "ADI-23", version: "1.0.0", submit, review, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const r = runtime?.getService?.("adi.recommendation_generation"), t = runtime?.getService?.("adi.red_team_validation");
    if (!r?.ok || !t?.ok) return fail("ADI_GATE_DEPENDENCY_REQUIRED", "ADI-21 and ADI-22 must be attached before ADI-23.");
    const e = createDecisionGateEngine({ ...options, recommendationEngine: r.data, redTeamEngine: t.data, createId: runtime.createId, emit: runtime.emit });
    let x = runtime.registerService("adi.decision_gate", e, { blockId: "ADI-23", version: "1.0.0" });
    if (!x.ok) return x;
    for (const [n, h] of [["adi.gate.submit", (q) => e.submit(q)], ["adi.gate.review", (q) => e.review(q)], ["adi.gate.get", (q) => e.get(q)]]) {
      x = runtime.registerRoute(n, h, { blockId: "ADI-23" });
      if (!x.ok) return x;
    }
    return runtime.success({ blockId: "ADI-23", service: "adi.decision_gate" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-23"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-24-Approved-Business-Action-Package-Publication-Handoff ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-24-Approved-Business-Action-Package-Publication-Handoff/src/adi-24-approved-business-action-package-publication-handoff.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-24-Approved-Business-Action-Package-Publication-Handoff/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createABAHandoffEngine: () => createABAHandoffEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  var digest = async (x) => {
    const bytes = new TextEncoder().encode(JSON.stringify(x));
    const buf = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  function createABAHandoffEngine(options = {}) {
    const gateEngine = options.gateEngine, recommendationEngine = options.recommendationEngine, explainabilityEngine = options.explainabilityEngine, publisher = options.publisher ?? null, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const packages = /* @__PURE__ */ new Map(), byGate = /* @__PURE__ */ new Map();
    async function build(input = {}) {
      const gate = gateEngine?.get({ gateId: input.gateId, tenantId: input.tenantId, businessId: input.businessId });
      if (!gate?.ok) return fail("ADI_HANDOFF_GATE_INVALID", "Decision gate is required.");
      if (gate.data.status !== "endorsed_for_aba") return fail("ADI_HANDOFF_NOT_ENDORSED", "Gate must be endorsed for ABA handoff.");
      const existing = byGate.get(gate.data.gateId);
      if (existing) return ok(packages.get(existing), { idempotentReplay: true });
      const rec = recommendationEngine?.get({ recommendationId: gate.data.recommendationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!rec?.ok || !rec.data.recommendedAlternativeId) return fail("ADI_HANDOFF_RECOMMENDATION_INVALID", "A qualified recommendation is required.");
      const exp = explainabilityEngine?.get({ explanationId: rec.data.explanationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!exp?.ok) return fail("ADI_HANDOFF_EXPLANATION_INVALID", "Explanation is required.");
      const payload = { sourceLayer: "ADI", targetLayer: "ABA", handoffContract: "ABA-02", tenantId: rec.data.tenantId, businessId: rec.data.businessId, decisionId: rec.data.decisionId, recommendation: { recommendationId: rec.data.recommendationId, recommendedAlternativeId: rec.data.recommendedAlternativeId, fallbackAlternativeIds: rec.data.fallbackAlternativeIds, conditions: rec.data.conditions, nextBestAction: rec.data.nextBestAction, monitoringRequirements: rec.data.monitoringRequirements }, assurance: { rankingId: rec.data.rankingId, confidenceReportId: rec.data.confidenceReportId, riskAssessmentId: rec.data.riskAssessmentId, explanationId: rec.data.explanationId, redTeamReportId: gate.data.redTeamReportId, gateId: gate.data.gateId, review: gate.data.reviews.at(-1) }, rationale: { summary: exp.data.summary, limitations: exp.data.limitations, assumptions: exp.data.assumptions } };
      const pkg = Object.freeze({ decisionPackageId: createId("aba_decision_package"), ...payload, payloadDigest: await digest(payload), status: "ready_for_handoff", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Handoff package only; ABA retains approval and execution authority." });
      packages.set(pkg.decisionPackageId, pkg);
      byGate.set(gate.data.gateId, pkg.decisionPackageId);
      await emit("adi.handoff.ready", { decisionPackageId: pkg.decisionPackageId, payloadDigest: pkg.payloadDigest }, { tenantId: pkg.tenantId, businessId: pkg.businessId, decisionId: pkg.decisionId });
      return ok(pkg);
    }
    async function publish(input = {}) {
      const pkg = packages.get(input.decisionPackageId);
      if (!pkg || pkg.tenantId !== input.tenantId || pkg.businessId !== input.businessId) return fail("ADI_HANDOFF_PACKAGE_NOT_FOUND", "Decision package was not found.");
      if (!publisher?.publish) return fail("ADI_HANDOFF_PUBLISHER_REQUIRED", "A publisher adapter is required.");
      const receipt = await publisher.publish(structuredClone(pkg));
      if (!receipt?.publicationId) return fail("ADI_HANDOFF_RECEIPT_INVALID", "Publisher must return publicationId.");
      await emit("adi.handoff.published", { decisionPackageId: pkg.decisionPackageId, publicationId: receipt.publicationId }, { tenantId: pkg.tenantId, businessId: pkg.businessId, decisionId: pkg.decisionId });
      return ok(Object.freeze({ decisionPackageId: pkg.decisionPackageId, publicationId: receipt.publicationId, publishedAt: receipt.publishedAt ?? (/* @__PURE__ */ new Date()).toISOString(), target: "ABA", status: "published" }));
    }
    function get(q) {
      const x = packages.get(q.decisionPackageId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_HANDOFF_PACKAGE_NOT_FOUND", "Decision package was not found.");
    }
    return Object.freeze({ blockId: "ADI-24", version: "1.0.0", build, publish, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const g = runtime?.getService?.("adi.decision_gate"), r = runtime?.getService?.("adi.recommendation_generation"), e = runtime?.getService?.("adi.explainability");
    if (!g?.ok || !r?.ok || !e?.ok) return fail("ADI_HANDOFF_DEPENDENCY_REQUIRED", "ADI-20, ADI-21 and ADI-23 must be attached before ADI-24.");
    const x = createABAHandoffEngine({ ...options, gateEngine: g.data, recommendationEngine: r.data, explainabilityEngine: e.data, createId: runtime.createId, emit: runtime.emit });
    let y = runtime.registerService("adi.aba_handoff", x, { blockId: "ADI-24", version: "1.0.0" });
    if (!y.ok) return y;
    for (const [n, h] of [["adi.handoff.build", (q) => x.build(q)], ["adi.handoff.publish", (q) => x.publish(q)], ["adi.handoff.get", (q) => x.get(q)]]) {
      y = runtime.registerRoute(n, h, { blockId: "ADI-24" });
      if (!y.ok) return y;
    }
    return runtime.success({ blockId: "ADI-24", service: "adi.aba_handoff" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-24"] = __adiBlockExports;
})(window);

/* ===== INFINICUS-ADI-25-AI-Decision-Intelligence-Master-Integration-Deployment-Engine ===== */

/* --- ai-decision-intelligence/INFINICUS-ADI-25-AI-Decision-Intelligence-Master-Integration-Deployment-Engine/src/adi-25-ai-decision-intelligence-master-integration-deployment-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-25-AI-Decision-Intelligence-Master-Integration-Deployment-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    ADI_DEPLOYMENT_MANIFEST: () => ADI_DEPLOYMENT_MANIFEST,
    attachToADIRuntime: () => attachToADIRuntime,
    createMasterIntegrationEngine: () => createMasterIntegrationEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var names = ["AI Decision Intelligence Core Runtime and Registry", "Decision Request Intake and Validation Engine", "Decision Identity, Ownership and Access Control Engine", "Decision Context Acquisition and Normalization Engine", "Business Digital Twin Context Adapter", "Simulation Engine Results Adapter", "Decision Evidence and Provenance Registry", "Business Goal Registry", "Decision Trigger Registry", "Business Problem Definition Engine", "Decision Context and Evidence Assembly Engine", "Decision Objectives, Constraints and Criteria Engine", "Strategic Alternative Generation Engine", "Alternative Feasibility and Eligibility Filter", "Impact, Dependency and Trade-off Analysis Engine", "Simulation Orchestration and Scenario Comparison Engine", "Risk, Opportunity and Downside Assessment Engine", "Multi-Criteria Decision Scoring and Ranking Engine", "Uncertainty, Confidence and Calibration Engine", "Explainability, Evidence Trace and Reasoning Engine", "Next-Best-Action and Recommendation Generation Engine", "Recommendation Challenge and Red-Team Validation Engine", "Decision Gate, Escalation and Human Review Engine", "Approved Business Action Package Publication and Handoff", "AI Decision Intelligence Master Integration and Deployment Engine"];
  var services = ["adi.core_runtime", "adi.decision_request_intake", "adi.access_control", "adi.decision_context", "adi.digital_twin_context_adapter", "adi.simulation_results_adapter", "adi.evidence_registry", "adi.goal_registry", "adi.trigger_registry", "adi.problem_definition", "adi.context_evidence_assembly", "adi.evaluation_framework", "adi.alternative_generation", "adi.feasibility_filter", "adi.impact_analysis", "adi.simulation_orchestration", "adi.risk_assessment", "adi.scoring_ranking", "adi.confidence_calibration", "adi.explainability", "adi.recommendation_generation", "adi.red_team_validation", "adi.decision_gate", "adi.aba_handoff", "adi.master_integration"];
  var ADI_DEPLOYMENT_MANIFEST = Object.freeze(names.map((name, i) => Object.freeze({ blockId: `ADI-${String(i + 1).padStart(2, "0")}`, sequence: i + 1, name, service: services[i], dependsOn: Object.freeze(i === 0 ? [] : [`ADI-${String(i).padStart(2, "0")}`]), required: true, version: "1.0.0" })));
  function createMasterIntegrationEngine(options = {}) {
    const runtime = options.runtime;
    if (!runtime?.listServices || !runtime?.listRoutes) return Object.freeze({ blockId: "ADI-25", version: "1.0.0", diagnose: () => fail("ADI_MASTER_RUNTIME_REQUIRED", "ADI runtime is required."), assertReady: () => fail("ADI_MASTER_RUNTIME_REQUIRED", "ADI runtime is required."), deploymentPlan: () => ok(ADI_DEPLOYMENT_MANIFEST) });
    function diagnose() {
      const listed = runtime.listServices();
      if (!listed?.ok) return fail("ADI_MASTER_DIAGNOSTIC_FAILED", "Unable to list runtime services.");
      const map = new Map(listed.data.map((x) => [x.id, x]));
      const missing = [], misidentified = [];
      for (const block of ADI_DEPLOYMENT_MANIFEST) {
        const record = map.get(block.service);
        if (!record) missing.push(block);
        else if (record.metadata?.blockId !== block.blockId) misidentified.push({ service: block.service, expectedBlockId: block.blockId, actualBlockId: record.metadata?.blockId ?? null });
      }
      const routes = runtime.listRoutes();
      const status = !missing.length && !misidentified.length ? "ready" : "degraded";
      return ok(Object.freeze({ layer: "AI Decision Intelligence", status, expectedBlocks: 25, registeredRequiredServices: 25 - missing.length, registeredRoutes: routes?.ok ? routes.data.length : null, missingServices: Object.freeze(missing), misidentifiedServices: Object.freeze(misidentified), abaBoundary: Object.freeze({ handoffService: "adi.aba_handoff", contract: "ABA-02", businessActionAuthority: "ABA" }), diagnosedAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0" }));
    }
    function assertReady() {
      const result = diagnose();
      return result.ok && result.data.status === "ready" ? result : fail("ADI_MASTER_NOT_READY", "ADI layer is not deployment-ready.", result.data);
    }
    function deploymentPlan() {
      return ok(ADI_DEPLOYMENT_MANIFEST.map((x) => ({ ...x, dependsOn: [...x.dependsOn] })));
    }
    return Object.freeze({ blockId: "ADI-25", version: "1.0.0", diagnose, assertReady, deploymentPlan });
  }
  function attachToADIRuntime(runtime, options = {}) {
    for (const block of ADI_DEPLOYMENT_MANIFEST.slice(0, -1)) {
      const x = runtime?.getService?.(block.service);
      if (!x?.ok) return fail("ADI_MASTER_DEPENDENCY_REQUIRED", `${block.blockId} service is required before ADI-25.`, { blockId: block.blockId, service: block.service });
    }
    const engine = createMasterIntegrationEngine({ ...options, runtime });
    let r = runtime.registerService("adi.master_integration", engine, { blockId: "ADI-25", version: "1.0.0" });
    if (!r.ok) return r;
    for (const [n, h] of [["adi.master.diagnose", () => engine.diagnose()], ["adi.master.assert-ready", () => engine.assertReady()], ["adi.master.deployment-plan", () => engine.deploymentPlan()]]) {
      r = runtime.registerRoute(n, h, { blockId: "ADI-25" });
      if (!r.ok) return r;
    }
    return runtime.success({ blockId: "ADI-25", service: "adi.master_integration", status: engine.diagnose().data.status });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-25"] = __adiBlockExports;
})(window);

/* ===== ADI BOOTSTRAP — install runtime and attach all blocks ===== */

(function(global){
"use strict";
var INF = global.INFINICUS = global.INFINICUS || {};
var ADI = INF.ADI = INF.ADI || {};
var blocks = ADI.blocks || {};
if (!blocks["ADI-01"] || typeof blocks["ADI-01"].installGlobal !== "function") {
  if (global.console && console.error) console.error("[INFINICUS.ADI] ADI-01 block missing; bootstrap aborted.");
  return;
}
var runtime = blocks["ADI-01"].installGlobal(global);
ADI.handoffOutbox = ADI.handoffOutbox || [];

/* BUILD-07 — SIM integration: typed port adapters over the Engine v3 facade
   (window.INFINICUS.SIMULATION). Direct window access is isolated here; ADI
   domain logic receives injected ports only. Deterministic failures remain
   when no engine/facade is configured. */
function resolveSimulationEngine(operation) {
  var sim = global.INFINICUS && global.INFINICUS.SIMULATION;
  if (!sim || typeof sim !== "object") {
    throw new Error("SIM_ENGINE_UNAVAILABLE: window.INFINICUS.SIMULATION is not available.");
  }
  if (typeof sim[operation] !== "function") {
    throw new Error("SIM_ENGINE_OPERATION_UNAVAILABLE: window.INFINICUS.SIMULATION." + operation + " is not available.");
  }
  return sim;
}

/* ExecuteSimulationScenarioPort adapter for ADI-16. Engine parameters must
   arrive via simulationPolicy.engineParameters — never fabricated here. */
function executeSimulationScenario(query) {
  var sim = resolveSimulationEngine("executeScenario");
  var policy = query.simulationPolicy || {};
  var parameters = policy.engineParameters;
  if (!parameters || typeof parameters !== "object") {
    throw new Error("SIM_ENGINE_PARAMETERS_REQUIRED: simulationPolicy.engineParameters is required for scenario execution.");
  }
  var result = sim.executeScenario({
    tenantId: query.tenantId,
    businessId: query.businessId,
    correlationId: policy.correlationId || query.decisionId,
    decisionId: query.decisionId,
    scenarioId: query.alternative && query.alternative.alternativeId,
    idempotencyKey: policy.idempotencyKey ||
      (query.decisionId + "::" + (query.alternative && query.alternative.alternativeId)),
    parameters: parameters
  });
  if (!result || result.ok !== true) {
    var err = (result && result.error) || { code: "SIM_EXECUTION_FAILED", message: "Unknown engine failure." };
    throw new Error(err.code + ": " + err.message);
  }
  return result.run;
}

/* ReadCompletedSimulationRunPort adapter for ADI-06. Returns only completed
   runs inside the caller's tenant/business boundary. */
function readCompletedSimulationRuns(query) {
  var sim = resolveSimulationEngine("getCompletedRun");
  var runIds = (query && query.runIds) || [];
  if (!runIds.length) {
    throw new Error("SIM_RUN_IDS_REQUIRED: at least one runId is required to read completed simulation runs.");
  }
  var runs = [];
  var failures = [];
  for (var r = 0; r < runIds.length; r++) {
    var result = sim.getCompletedRun({
      tenantId: query.tenantId,
      businessId: query.businessId,
      runId: runIds[r],
      decisionId: query.decisionId
    });
    if (result && result.ok === true) {
      runs.push(result.run);
    } else {
      var failure = (result && result.error) || { code: "SIM_READ_FAILED", message: "Unknown engine failure." };
      failures.push(runIds[r] + " (" + failure.code + ")");
    }
  }
  if (!runs.length) {
    throw new Error("SIM_RUNS_UNAVAILABLE: no completed simulation runs could be read: " + failures.join(", "));
  }
  return runs;
}

ADI.simulationPorts = Object.freeze({
  executeScenario: executeSimulationScenario,
  readCompletedRun: readCompletedSimulationRuns
});

var attachOptions = {
  "ADI-05": { readSnapshot: async function () { return null; } },
  "ADI-06": { readCompletedRun: async function (query) { return readCompletedSimulationRuns(query); } },
  "ADI-16": { executeScenario: async function (query) { return executeSimulationScenario(query); } },
  "ADI-24": { publisher: { publish: async function (pkg) {
    var publicationId = "aba_publication_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    ADI.handoffOutbox.push({ publicationId: publicationId, decisionPackageId: pkg.decisionPackageId, payloadDigest: pkg.payloadDigest, publishedAt: new Date().toISOString() });
    return { publicationId: publicationId };
  } } }
};
var order = ["ADI-02", "ADI-03", "ADI-04", "ADI-05", "ADI-06", "ADI-07", "ADI-08", "ADI-09", "ADI-10", "ADI-11", "ADI-12", "ADI-13", "ADI-14", "ADI-15", "ADI-16", "ADI-17", "ADI-18", "ADI-19", "ADI-20", "ADI-21", "ADI-22", "ADI-23", "ADI-24", "ADI-25"];
ADI.attachResults = {};
for (var i = 0; i < order.length; i++) {
  var id = order[i];
  var block = blocks[id];
  if (!block || typeof block.attachToADIRuntime !== "function") {
    ADI.attachResults[id] = { ok: false, data: null, error: { code: "ADI_BLOCK_MISSING", message: id + " block is not loaded." }, meta: {} };
  } else {
    try {
      ADI.attachResults[id] = block.attachToADIRuntime(runtime, attachOptions[id] || {});
    } catch (error) {
      ADI.attachResults[id] = { ok: false, data: null, error: { code: "ADI_ATTACH_THREW", message: String(error && error.message) }, meta: {} };
    }
  }
  if (ADI.attachResults[id] && ADI.attachResults[id].ok === false && global.console && console.warn) {
    console.warn("[INFINICUS.ADI] attach failed for " + id, ADI.attachResults[id].error);
  }
}
ADI.listServices = function () { return runtime.listServices(); };
ADI.dispatch = function (name, request, context) { return runtime.dispatch(name, request, context); };
})(window);
