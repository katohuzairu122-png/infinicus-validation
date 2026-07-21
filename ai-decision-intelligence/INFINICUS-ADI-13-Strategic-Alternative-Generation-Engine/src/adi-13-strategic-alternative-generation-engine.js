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
