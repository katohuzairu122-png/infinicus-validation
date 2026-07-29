/* --- ai-decision-intelligence/INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine/src/adi-18-multi-criteria-decision-scoring-ranking-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createScoringEngine: () => createScoringEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  var clamp = (x) => Math.max(0, Math.min(100, Number(x)));
  function createScoringEngine(options = {}) {
    const frameworkEngine = options.frameworkEngine, feasibilityFilter = options.feasibilityFilter, alternativeEngine = options.alternativeEngine, riskEngine = options.riskEngine;
    const evaluators = options.evaluators ?? [];
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => ok(null));
    const rankings = /* @__PURE__ */ new Map();
    async function score(input = {}) {
      const fw = frameworkEngine?.get({ frameworkId: input.frameworkId, tenantId: input.tenantId, businessId: input.businessId });
      const feas = feasibilityFilter?.get({ feasibilityReportId: input.feasibilityReportId, tenantId: input.tenantId, businessId: input.businessId });
      if (!fw?.ok || fw.data.status !== "locked" || !feas?.ok) return fail("ADI_SCORING_INPUT_INVALID", "Locked framework and feasibility report are required.");
      const set = alternativeEngine?.get({ alternativeSetId: feas.data.alternativeSetId, tenantId: input.tenantId, businessId: input.businessId });
      if (!set?.ok) return fail("ADI_SCORING_ALTERNATIVES_INVALID", "Alternative set was not found.");
      const rows = [];
      for (const alt of set.data.alternatives) {
        const eligibility = feas.data.results.find((x) => x.alternativeId === alt.alternativeId);
        if (eligibility?.status !== "eligible") {
          rows.push(Object.freeze({ alternativeId: alt.alternativeId, eligibilityStatus: eligibility?.status ?? "unknown", criterionScores: Object.freeze([]), totalScore: null, coverage: 0, rank: null }));
          continue;
        }
        const scores = [];
        for (const criterion of fw.data.criteria) {
          let result = null;
          for (const evaluator of evaluators) {
            if (evaluator.supports && !evaluator.supports(criterion, alt)) continue;
            try {
              result = await evaluator.score({ alternative: alt, criterion, inputs: input.inputs ?? {} });
              if (result) break;
            } catch {
            }
          }
          if (!result || !Number.isFinite(Number(result.score))) {
            scores.push(Object.freeze({ criterionId: criterion.criterionId, score: null, normalizedWeight: criterion.normalizedWeight, weightedContribution: null, evaluatorId: null, evidenceIds: Object.freeze([]), reason: "score_missing" }));
            continue;
          }
          const value = clamp(result.score);
          scores.push(Object.freeze({ criterionId: criterion.criterionId, score: value, normalizedWeight: criterion.normalizedWeight, weightedContribution: Math.round(value * criterion.normalizedWeight * 1e4) / 1e4, evaluatorId: result.evaluatorId ?? "unknown", evidenceIds: Object.freeze([...result.evidenceIds ?? []]), reason: result.reason ?? null }));
        }
        const available = scores.filter((x) => x.score !== null);
        const weightCovered = available.reduce((s, x) => s + x.normalizedWeight, 0);
        const total = weightCovered ? available.reduce((s, x) => s + x.weightedContribution, 0) / weightCovered : null;
        rows.push(Object.freeze({ alternativeId: alt.alternativeId, eligibilityStatus: "eligible", criterionScores: Object.freeze(scores), totalScore: total === null ? null : Math.round(total * 1e4) / 1e4, coverage: Math.round(weightCovered * 1e4) / 1e4, rank: null }));
      }
      const ranked = rows.filter((x) => x.totalScore !== null).sort((a, b) => b.totalScore - a.totalScore);
      let last = null, rank = 0;
      const ranks = /* @__PURE__ */ new Map();
      ranked.forEach((x, i) => {
        if (last === null || x.totalScore < last) rank = i + 1;
        ranks.set(x.alternativeId, rank);
        last = x.totalScore;
      });
      const finalRows = rows.map((x) => {
        const assignedRank = ranks.get(x.alternativeId) ?? null;
        return Object.freeze({ ...x, rank: assignedRank, tiedWith: Object.freeze(assignedRank === null ? [] : ranked.filter((y) => y.alternativeId !== x.alternativeId && ranks.get(y.alternativeId) === assignedRank).map((y) => y.alternativeId)) });
      });
      const report = Object.freeze({ rankingId: createId("ranking"), frameworkId: fw.data.frameworkId, feasibilityReportId: feas.data.feasibilityReportId, riskAssessmentId: input.riskAssessmentId ?? null, tenantId: set.data.tenantId, businessId: set.data.businessId, decisionId: set.data.decisionId, rows: Object.freeze(finalRows), method: "weighted_normalized_sum", status: finalRows.some((x) => x.eligibilityStatus === "eligible" && x.coverage < 1) ? "partial" : "completed", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Analytical ranking only; not a recommendation or approval." });
      rankings.set(report.rankingId, report);
      await emit("adi.alternatives.ranked", { rankingId: report.rankingId, status: report.status }, { tenantId: report.tenantId, businessId: report.businessId, decisionId: report.decisionId });
      return ok(report);
    }
    function get(q) {
      const x = rankings.get(q.rankingId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_RANKING_NOT_FOUND", "Ranking was not found.");
    }
    return Object.freeze({ blockId: "ADI-18", version: "1.0.0", score, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const f = runtime?.getService?.("adi.evaluation_framework"), e = runtime?.getService?.("adi.feasibility_filter"), a = runtime?.getService?.("adi.alternative_generation"), r = runtime?.getService?.("adi.risk_assessment");
    if (!f?.ok || !e?.ok || !a?.ok || !r?.ok) return fail("ADI_SCORING_DEPENDENCY_REQUIRED", "ADI-12, ADI-14, ADI-17 and alternative service are required.");
    const engine = createScoringEngine({ ...options, frameworkEngine: f.data, feasibilityFilter: e.data, alternativeEngine: a.data, riskEngine: r.data, createId: runtime.createId, emit: runtime.emit });
    let x = runtime.registerService("adi.scoring_ranking", engine, { blockId: "ADI-18", version: "1.0.0" });
    if (!x.ok) return x;
    for (const [n, h] of [["adi.ranking.score", (q) => engine.score(q)], ["adi.ranking.get", (q) => engine.get(q)]]) {
      x = runtime.registerRoute(n, h, { blockId: "ADI-18" });
      if (!x.ok) return x;
    }
    return runtime.success({ blockId: "ADI-18", service: "adi.scoring_ranking" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-18"] = __adiBlockExports;
})(window);
