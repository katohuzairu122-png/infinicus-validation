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
