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
