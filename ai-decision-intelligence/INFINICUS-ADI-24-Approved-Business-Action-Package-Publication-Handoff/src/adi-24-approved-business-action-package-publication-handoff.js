/* --- ai-decision-intelligence/INFINICUS-ADI-24-Approved-Business-Action-Package-Publication-Handoff/src/adi-24-approved-business-action-package-publication-handoff.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-24-Approved-Business-Action-Package-Publication-Handoff/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createABAHandoffEngine: () => createABAHandoffEngine
  });
  var ok = (data, meta = {}) => ({ ok: true, data, error: null, meta });
  var fail = (code, message, details = null) => ({ ok: false, data: null, error: { code, message, details }, meta: {} });
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  var digest = async (x) => {
    const bytes = new TextEncoder().encode(JSON.stringify(x));
    const buf = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  function createABAHandoffEngine(options = {}) {
    const gateEngine = options.gateEngine, recommendationEngine = options.recommendationEngine, explainabilityEngine = options.explainabilityEngine, publisher = options.publisher ?? null, createId = options.createId ?? id, emit = options.emit ?? (async () => ok(null));
    const packages = /* @__PURE__ */ new Map(), byGate = /* @__PURE__ */ new Map();
    async function build(input = {}) {
      const gate = gateEngine?.get({ gateId: input.gateId, tenantId: input.tenantId, businessId: input.businessId });
      if (!gate?.ok) return fail("ADI_HANDOFF_GATE_INVALID", "Decision gate is required.");
      if (gate.data.status !== "endorsed_for_aba") return fail("ADI_HANDOFF_NOT_ENDORSED", "Gate must be endorsed for ABA handoff.");
      const existing = byGate.get(gate.data.gateId);
      if (existing) return ok(packages.get(existing), { idempotentReplay: true });
      const rec = recommendationEngine?.get({ recommendationId: gate.data.recommendationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!rec?.ok || !rec.data.recommendedAlternativeId) return fail("ADI_HANDOFF_RECOMMENDATION_INVALID", "A qualified recommendation is required.");
      const exp = explainabilityEngine?.get({ explanationId: rec.data.explanationId, tenantId: input.tenantId, businessId: input.businessId });
      if (!exp?.ok) return fail("ADI_HANDOFF_EXPLANATION_INVALID", "Explanation is required.");
      const payload = { sourceLayer: "ADI", targetLayer: "ABA", handoffContract: "ABA-02", tenantId: rec.data.tenantId, businessId: rec.data.businessId, decisionId: rec.data.decisionId, recommendation: { recommendationId: rec.data.recommendationId, recommendedAlternativeId: rec.data.recommendedAlternativeId, fallbackAlternativeIds: rec.data.fallbackAlternativeIds, conditions: rec.data.conditions, nextBestAction: rec.data.nextBestAction, monitoringRequirements: rec.data.monitoringRequirements }, assurance: { rankingId: rec.data.rankingId, confidenceReportId: rec.data.confidenceReportId, riskAssessmentId: rec.data.riskAssessmentId, explanationId: rec.data.explanationId, redTeamReportId: gate.data.redTeamReportId, gateId: gate.data.gateId, review: gate.data.reviews.at(-1) }, rationale: { summary: exp.data.summary, limitations: exp.data.limitations, assumptions: exp.data.assumptions } };
      const pkg = Object.freeze({ decisionPackageId: createId("aba_decision_package"), ...payload, payloadDigest: await digest(payload), status: "ready_for_handoff", createdAt: (/* @__PURE__ */ new Date()).toISOString(), schemaVersion: "1.0.0", disclaimer: "Handoff package only; ABA retains approval and execution authority." });
      packages.set(pkg.decisionPackageId, pkg);
      byGate.set(gate.data.gateId, pkg.decisionPackageId);
      await emit("adi.handoff.ready", { decisionPackageId: pkg.decisionPackageId, payloadDigest: pkg.payloadDigest }, { tenantId: pkg.tenantId, businessId: pkg.businessId, decisionId: pkg.decisionId });
      return ok(pkg);
    }
    async function publish(input = {}) {
      const pkg = packages.get(input.decisionPackageId);
      if (!pkg || pkg.tenantId !== input.tenantId || pkg.businessId !== input.businessId) return fail("ADI_HANDOFF_PACKAGE_NOT_FOUND", "Decision package was not found.");
      if (!publisher?.publish) return fail("ADI_HANDOFF_PUBLISHER_REQUIRED", "A publisher adapter is required.");
      const receipt = await publisher.publish(structuredClone(pkg));
      if (!receipt?.publicationId) return fail("ADI_HANDOFF_RECEIPT_INVALID", "Publisher must return publicationId.");
      await emit("adi.handoff.published", { decisionPackageId: pkg.decisionPackageId, publicationId: receipt.publicationId }, { tenantId: pkg.tenantId, businessId: pkg.businessId, decisionId: pkg.decisionId });
      return ok(Object.freeze({ decisionPackageId: pkg.decisionPackageId, publicationId: receipt.publicationId, publishedAt: receipt.publishedAt ?? (/* @__PURE__ */ new Date()).toISOString(), target: "ABA", status: "published" }));
    }
    function get(q) {
      const x = packages.get(q.decisionPackageId);
      return x && x.tenantId === q.tenantId && x.businessId === q.businessId ? ok(x) : fail("ADI_HANDOFF_PACKAGE_NOT_FOUND", "Decision package was not found.");
    }
    return Object.freeze({ blockId: "ADI-24", version: "1.0.0", build, publish, get });
  }
  function attachToADIRuntime(runtime, options = {}) {
    const g = runtime?.getService?.("adi.decision_gate"), r = runtime?.getService?.("adi.recommendation_generation"), e = runtime?.getService?.("adi.explainability");
    if (!g?.ok || !r?.ok || !e?.ok) return fail("ADI_HANDOFF_DEPENDENCY_REQUIRED", "ADI-20, ADI-21 and ADI-23 must be attached before ADI-24.");
    const x = createABAHandoffEngine({ ...options, gateEngine: g.data, recommendationEngine: r.data, explainabilityEngine: e.data, createId: runtime.createId, emit: runtime.emit });
    let y = runtime.registerService("adi.aba_handoff", x, { blockId: "ADI-24", version: "1.0.0" });
    if (!y.ok) return y;
    for (const [n, h] of [["adi.handoff.build", (q) => x.build(q)], ["adi.handoff.publish", (q) => x.publish(q)], ["adi.handoff.get", (q) => x.get(q)]]) {
      y = runtime.registerRoute(n, h, { blockId: "ADI-24" });
      if (!y.ok) return y;
    }
    return runtime.success({ blockId: "ADI-24", service: "adi.aba_handoff" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-24"] = __adiBlockExports;
})(window);
