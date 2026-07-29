/* --- ai-decision-intelligence/INFINICUS-ADI-23-Decision-Gate-Escalation-Human-Review-Engine/src/adi-23-decision-gate-escalation-human-review-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-23-Decision-Gate-Escalation-Human-Review-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createDecisionGateEngine: () => createDecisionGateEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  function createDecisionGateEngine(options = {}) {
    const recommendationEngine = options.recommendationEngine, redTeamEngine = options.redTeamEngine, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const gates = /* @__PURE__ */ new Map();
    async function submit(input = {}) {
      const rec = recommendationEngine?.get({ recommendationId: input.recommendationId, tenantId: input.tenantId, businessId: input.businessId }), red = redTeamEngine?.get({ redTeamReportId: input.redTeamReportId, tenantId: input.tenantId, businessId: input.businessId });
      if (!rec?.ok || !red?.ok || red.data.recommendationId !== rec.data.recommendationId) return fail("ADI_GATE_INPUT_INVALID", "Matching recommendation and red-team report are required.");
      if (rec.data.status !== "proposed") return fail("ADI_GATE_RECOMMENDATION_NOT_ACTIONABLE", "Only proposed recommendations may enter review.");
      const gate = Object.freeze({ gateId: createId("decision_gate"), recommendationId: rec.data.recommendationId, redTeamReportId: red.data.redTeamReportId, tenantId: rec.data.tenantId, businessId: rec.data.businessId, decisionId: rec.data.decisionId, status: red.data.disposition === "failed" ? "escalated" : "pending_review", submittedBy: input.submittedBy ?? "system", submittedAt: (/* @__PURE__ */ new Date()).toISOString(), reviews: Object.freeze([]), schemaVersion: "1.0.0" });
      gates.set(gate.gateId, gate);
      await emit("adi.gate.submitted", { gateId: gate.gateId, status: gate.status }, { tenantId: gate.tenantId, businessId: gate.businessId, decisionId: gate.decisionId });
      return ok(gate);
    }
    async function review(input = {}) {
      const gate = gates.get(input.gateId);
      if (!gate || gate.tenantId !== input.tenantId || gate.businessId !== input.businessId) return fail("ADI_GATE_NOT_FOUND", "Decision gate was not found.");
      if (!input.reviewerId || !input.reviewerRole || !String(input.assertion ?? "").trim()) return fail("ADI_GATE_REVIEW_IDENTITY_REQUIRED", "Reviewer ID, role and assertion are required.");
      const allowed = /* @__PURE__ */ new Set(["endorse_for_aba", "return_for_revision", "escalate", "reject_recommendation"]);
      if (!allowed.has(input.decision)) return fail("ADI_GATE_REVIEW_DECISION_INVALID", "Unsupported review decision.");
      const red = redTeamEngine.get({ redTeamReportId: gate.redTeamReportId, tenantId: gate.tenantId, businessId: gate.businessId });
      if (input.decision === "endorse_for_aba" && red.data.disposition === "failed") return fail("ADI_GATE_BLOCKERS_UNRESOLVED", "A failed red-team report cannot be endorsed.");
      const status = { endorse_for_aba: "endorsed_for_aba", return_for_revision: "returned_for_revision", escalate: "escalated", reject_recommendation: "rejected_recommendation" }[input.decision];
      const record = Object.freeze({ reviewId: createId("gate_review"), reviewerId: String(input.reviewerId), reviewerRole: String(input.reviewerRole), decision: input.decision, assertion: String(input.assertion).trim(), conditions: Object.freeze(structuredClone(input.conditions ?? [])), reviewedAt: input.reviewedAt ?? (/* @__PURE__ */ new Date()).toISOString(), signatureRef: input.signatureRef ?? null });
      const updated = Object.freeze({ ...gate, status, reviews: Object.freeze([...gate.reviews, record]), lastReviewedAt: record.reviewedAt });
      gates.set(gate.gateId, updated);
      await emit("adi.gate.reviewed", { gateId: gate.gateId, reviewId: record.reviewId, status }, { tenantId: gate.tenantId, businessId: gate.businessId, decisionId: gate.decisionId });
      return ok(updated);
    }
    function get(q) {
      const x = gates.get(q.gateId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_GATE_NOT_FOUND", "Decision gate was not found.");
    }
    return Object.freeze({ blockId: "ADI-23", version: "1.0.0", submit, review, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const r = runtime?.getService?.("adi.recommendation_generation"), t = runtime?.getService?.("adi.red_team_validation");
    if (!r?.ok || !t?.ok) return fail("ADI_GATE_DEPENDENCY_REQUIRED", "ADI-21 and ADI-22 must be attached before ADI-23.");
    const e = createDecisionGateEngine({ ...options, recommendationEngine: r.data, redTeamEngine: t.data, createId: runtime.createId, emit: runtime.emit });
    let x = runtime.registerService("adi.decision_gate", e, { blockId: "ADI-23", version: "1.0.0" });
    if (!x.ok) return x;
    for (const [n, h] of [["adi.gate.submit", (q) => e.submit(q)], ["adi.gate.review", (q) => e.review(q)], ["adi.gate.get", (q) => e.get(q)]]) {
      x = runtime.registerRoute(n, h, { blockId: "ADI-23" });
      if (!x.ok) return x;
    }
    return runtime.success({ blockId: "ADI-23", service: "adi.decision_gate" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-23"] = __adiBlockExports;
})(window);
