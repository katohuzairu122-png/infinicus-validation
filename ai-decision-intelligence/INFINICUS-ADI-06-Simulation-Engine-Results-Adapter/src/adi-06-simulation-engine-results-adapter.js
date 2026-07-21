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
