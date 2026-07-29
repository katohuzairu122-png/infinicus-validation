/* --- ai-decision-intelligence/INFINICUS-ADI-22-Recommendation-Challenge-Red-Team-Validation-Engine/src/adi-22-recommendation-challenge-red-team-validation-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-22-Recommendation-Challenge-Red-Team-Validation-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createRedTeamEngine: () => createRedTeamEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createRedTeamEngine(options = {}) {
    const recommendationEngine = options.recommendationEngine, rankingEngine = options.rankingEngine, explainabilityEngine = options.explainabilityEngine, challengers = options.challengers ?? [], createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const reports = /* @__PURE__ */ new Map();
    async function challenge(input = {}) {
      const rec = recommendationEngine?.get({ recommendationId: input.recommendationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!rec?.ok) return fail("ADI_REDTEAM_RECOMMENDATION_INVALID", "Recommendation is required.");
      const snapshot = JSON.stringify(rec.data), ranking = rankingEngine?.get({ rankingId: rec.data.rankingId, tenantId: input.tenantId, businessId: input.businessId }), explanation = explainabilityEngine?.get({ explanationId: rec.data.explanationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!ranking?.ok || !explanation?.ok) return fail("ADI_REDTEAM_EVIDENCE_INVALID", "Ranking and explanation are required.");
      const findings = [];
      if (rec.data.status !== "proposed" || !rec.data.recommendedAlternativeId) findings.push({ severity: "blocker", code: "NO_ACTIONABLE_RECOMMENDATION", message: "There is no qualified recommendation to challenge." });
      const leader = ranking.data.rows.find((x) => x.rank === 1);
      if (leader?.tiedWith?.length) findings.push({ severity: "high", code: "LEADER_TIED", message: "The analytical leader is tied." });
      if ((leader?.coverage ?? 1) < 1) findings.push({ severity: "high", code: "INCOMPLETE_SCORE_COVERAGE", message: "Leader score coverage is incomplete." });
      if (!explanation.data.claims?.length) findings.push({ severity: "blocker", code: "MISSING_EXPLANATION_TRACE", message: "No structured explanation claims are present." });
      for (const challenger of challengers) {
        try {
          for (const f of await challenger.challenge({ recommendation: structuredClone(rec.data), ranking: ranking.data, explanation: explanation.data }) ?? []) findings.push({ severity: ["blocker", "high", "medium", "low"].includes(f.severity) ? f.severity : "medium", code: f.code ?? "EXTERNAL_CHALLENGE", message: f.message ?? "Challenge finding", evidenceRefs: [...f.evidenceRefs ?? []], challengerId: challenger.challengerId ?? "unknown" });
        } catch (error) {
          findings.push({ severity: "high", code: "CHALLENGER_FAILED", message: error.message, challengerId: challenger.challengerId ?? "unknown" });
        }
      }
      if (JSON.stringify(rec.data) !== snapshot) return fail("ADI_REDTEAM_MUTATION_DETECTED", "Source recommendation was mutated by a challenger.");
      const disposition = findings.some((x) => x.severity === "blocker") ? "failed" : findings.some((x) => x.severity === "high") ? "passed_with_conditions" : "passed";
      const report = Object.freeze({ redTeamReportId: createId("redteam_report"), recommendationId: rec.data.recommendationId, tenantId: rec.data.tenantId, businessId: rec.data.businessId, decisionId: rec.data.decisionId, findings: Object.freeze(findings.map(Object.freeze)), disposition, challengerCount: challengers.length, createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Independent challenge record; not an approval or execution instruction." });
      reports.set(report.redTeamReportId, report);
      await emit("adi.recommendation.challenged", { redTeamReportId: report.redTeamReportId, disposition }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = reports.get(q.redTeamReportId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_REDTEAM_REPORT_NOT_FOUND", "Red-team report was not found.");
    }
    return Object.freeze({ blockId: "ADI-22", version: "1.0.0", challenge, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const a = runtime?.getService?.("adi.recommendation_generation"), r = runtime?.getService?.("adi.scoring_ranking"), e = runtime?.getService?.("adi.explainability");
    if (!a?.ok || !r?.ok || !e?.ok) return fail("ADI_REDTEAM_DEPENDENCY_REQUIRED", "ADI-18, ADI-20 and ADI-21 must be attached before ADI-22.");
    const x = createRedTeamEngine({ ...options, recommendationEngine: a.data, rankingEngine: r.data, explainabilityEngine: e.data, createId: runtime.createId, emit: runtime.emit });
    let y = runtime.registerService("adi.red_team_validation", x, { blockId: "ADI-22", version: "1.0.0" });
    if (!y.ok) return y;
    for (const [n, h] of [["adi.redteam.challenge", (q) => x.challenge(q)], ["adi.redteam.get", (q) => x.get(q)]]) {
      y = runtime.registerRoute(n, h, { blockId: "ADI-22" });
      if (!y.ok) return y;
    }
    return runtime.success({ blockId: "ADI-22", service: "adi.red_team_validation" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-22"] = __adiBlockExports;
})(window);
