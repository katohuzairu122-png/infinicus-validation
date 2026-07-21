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
