/* --- ai-decision-intelligence/INFINICUS-ADI-20-Explainability-Evidence-Trace-Reasoning-Engine/src/adi-20-explainability-evidence-trace-reasoning-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-20-Explainability-Evidence-Trace-Reasoning-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createExplainabilityEngine: () => createExplainabilityEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createExplainabilityEngine(options = {}) {
    const rankingEngine = options.rankingEngine, confidenceEngine = options.confidenceEngine, riskEngine = options.riskEngine, summarizer = options.summarizer ?? null, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const bundles = /* @__PURE__ */ new Map();
    async function create(input = {}) {
      const ranking = rankingEngine?.get({ rankingId: input.rankingId, tenantId: input.tenantId, businessId: input.businessId });
      const confidence = confidenceEngine?.get({ confidenceReportId: input.confidenceReportId, tenantId: input.tenantId, businessId: input.businessId });
      const risk = riskEngine?.get({ riskAssessmentId: input.riskAssessmentId, tenantId: input.tenantId, businessId: input.businessId });
      if (!ranking?.ok || !confidence?.ok || !risk?.ok) return fail("ADI_EXPLANATION_INPUT_INVALID", "Ranking, confidence and risk reports are required.");
      const ordered = ranking.data.rows.filter((x) => x.rank !== null).sort((a, b) => a.rank - b.rank);
      const leader = ordered[0] ?? null;
      const claims = [];
      for (const row of ordered) {
        claims.push(Object.freeze({ claimId: createId("claim"), type: "ranking", statement: `Alternative ${row.alternativeId} has analytical rank ${row.rank} with score ${row.totalScore}.`, sourceRefs: Object.freeze([ranking.data.rankingId]), evidenceIds: Object.freeze(row.criterionScores.flatMap((x) => x.evidenceIds ?? [])) }));
      }
      for (const c of confidence.data.alternatives) {
        claims.push(Object.freeze({ claimId: createId("claim"), type: "confidence", statement: `Alternative ${c.alternativeId} has ${c.confidenceBand} confidence (${c.calibratedConfidence}).`, sourceRefs: Object.freeze([confidence.data.confidenceReportId]), evidenceIds: Object.freeze([]) }));
      }
      const whyNot = leader ? ordered.slice(1).map((row) => Object.freeze({ alternativeId: row.alternativeId, comparedWith: leader.alternativeId, scoreDelta: Math.round((leader.totalScore - row.totalScore) * 1e4) / 1e4, lowerContributors: Object.freeze(row.criterionScores.filter((x) => x.score !== null).sort((a, b) => a.weightedContribution - b.weightedContribution).slice(0, 3).map((x) => x.criterionId)) })) : [];
      const riskTrace = risk.data.alternatives.flatMap((a) => a.findings.map((f) => Object.freeze({ alternativeId: a.alternativeId, findingId: f.findingId, title: f.title, type: f.type, exposure: f.exposure, evidenceIds: Object.freeze([...f.evidenceIds ?? []]), sourceRef: risk.data.riskAssessmentId })));
      const limitations = [...input.limitations ?? []];
      for (const c of confidence.data.alternatives) for (const item of c.missingFactors ?? []) limitations.push(`Missing ${item} for ${c.alternativeId}.`);
      const structuredFacts = { leaderAlternativeId: leader?.alternativeId ?? null, claims, whyNot, riskTrace, limitations };
      let summary = leader ? `The current analytical leader is ${leader.alternativeId}; see claims, confidence and limitations for qualification.` : "No eligible ranked alternative is available.";
      if (summarizer?.summarize) {
        const s = await summarizer.summarize(structuredFacts);
        if (typeof s !== "string" || !s.trim()) return fail("ADI_EXPLANATION_SUMMARY_INVALID", "Summarizer must return a non-empty string.");
        summary = s.trim();
      }
      const bundle = Object.freeze({ explanationId: createId("explanation"), tenantId: ranking.data.tenantId, businessId: ranking.data.businessId, decisionId: ranking.data.decisionId, rankingId: ranking.data.rankingId, confidenceReportId: confidence.data.confidenceReportId, riskAssessmentId: risk.data.riskAssessmentId, explanationType: "decision_rationale_not_chain_of_thought", summary, claims: Object.freeze(claims), whyNot: Object.freeze(whyNot), riskTrace: Object.freeze(riskTrace), limitations: Object.freeze([...new Set(limitations)]), assumptions: Object.freeze([...input.assumptions ?? []]), createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Recorded rationale only; not private chain-of-thought, a recommendation or an approval." });
      bundles.set(bundle.explanationId, bundle);
      await emit("adi.explanation.created", { explanationId: bundle.explanationId }, { tenantId: bundle.tenantId, businessId: bundle.businessId, decisionId: bundle.decisionId });
      return ok(bundle);
    }
    function get(q) {
      const x = bundles.get(q.explanationId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_EXPLANATION_NOT_FOUND", "Explanation was not found.");
    }
    return Object.freeze({ blockId: "ADI-20", version: "1.0.0", create, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const r = runtime?.getService?.("adi.scoring_ranking"), c = runtime?.getService?.("adi.confidence_calibration"), k = runtime?.getService?.("adi.risk_assessment");
    if (!r?.ok || !c?.ok || !k?.ok) return fail("ADI_EXPLANATION_DEPENDENCY_REQUIRED", "ADI-17, ADI-18 and ADI-19 must be attached before ADI-20.");
    const e = createExplainabilityEngine({ ...options, rankingEngine: r.data, confidenceEngine: c.data, riskEngine: k.data, createId: runtime.createId, emit: runtime.emit });
    let x = runtime.registerService("adi.explainability", e, { blockId: "ADI-20", version: "1.0.0" });
    if (!x.ok) return x;
    for (const [n, h] of [["adi.explanation.create", (q) => e.create(q)], ["adi.explanation.get", (q) => e.get(q)]]) {
      x = runtime.registerRoute(n, h, { blockId: "ADI-20" });
      if (!x.ok) return x;
    }
    return runtime.success({ blockId: "ADI-20", service: "adi.explainability" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-20"] = __adiBlockExports;
})(window);
