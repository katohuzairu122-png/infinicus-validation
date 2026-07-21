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
