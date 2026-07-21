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
