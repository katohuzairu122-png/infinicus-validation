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
