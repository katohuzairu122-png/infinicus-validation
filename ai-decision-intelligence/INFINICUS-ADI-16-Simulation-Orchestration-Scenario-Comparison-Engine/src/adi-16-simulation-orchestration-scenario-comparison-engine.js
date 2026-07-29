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
