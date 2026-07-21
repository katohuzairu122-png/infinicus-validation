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
