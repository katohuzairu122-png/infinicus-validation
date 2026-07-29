/* --- ai-decision-intelligence/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/adi-11-decision-context-evidence-assembly-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    assessReadiness: () => assessReadiness,
    attachToADIRuntime: () => attachToADIRuntime,
    createAssemblyEngine: () => createAssemblyEngine,
    createAssemblyRepository: () => createAssemblyRepository,
    sha256: () => sha256
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/digest.js
  function canonical(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  }
  async function sha256(value) {
    if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
    const bytes = new TextEncoder().encode(canonical(value));
    const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/repository.js
  function createAssemblyRepository() {
    const histories = /* @__PURE__ */ new Map(), byDecision = /* @__PURE__ */ new Map();
    return Object.freeze({ append(record) {
      const h = histories.get(record.assemblyId) ?? [];
      if (h.length && record.version !== h.at(-1).version + 1) return false;
      h.push(record);
      histories.set(record.assemblyId, h);
      const key = `${record.tenantId}::${record.businessId}::${record.decisionId}`;
      const ids = byDecision.get(key) ?? /* @__PURE__ */ new Set();
      ids.add(record.assemblyId);
      byDecision.set(key, ids);
      return true;
    }, get({ assemblyId, tenantId, businessId, version }) {
      const h = histories.get(assemblyId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, list({ tenantId, businessId, decisionId }) {
      const ids = byDecision.get(`${tenantId}::${businessId}::${decisionId}`) ?? [];
      return [...ids].map((id2) => histories.get(id2).at(-1));
    }, history({ assemblyId, tenantId, businessId }) {
      return (histories.get(assemblyId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/readiness.js
  function assessReadiness({ context, evidence, goals, triggers, problems, verificationFailures, requiredSourceTypes = [] }) {
    const blockers = [], missing = [], warnings = [];
    if (!problems.length) blockers.push("problem_definition_required");
    if (!goals.length) missing.push("business_goal_missing");
    if (!evidence.length) blockers.push("verified_evidence_required");
    if (verificationFailures.length) blockers.push("evidence_verification_failed");
    if (context.quality?.usable === false) blockers.push("context_quality_unusable");
    if (context.conflicts?.length) warnings.push("context_conflicts_present");
    if (context.providerFailures?.length) warnings.push("context_provider_failures_present");
    for (const type of requiredSourceTypes) {
      if (!context.fragments.some((x) => x.sourceType === type)) missing.push(`source_missing:${type}`);
    }
    const status = blockers.length ? "blocked" : missing.length ? "needs_data" : "ready";
    return Object.freeze({ status, blockers: Object.freeze(blockers), missing: Object.freeze(missing), warnings: Object.freeze(warnings) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/assembly-engine.js
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  function createAssemblyEngine(options = {}) {
    const repository = options.repository ?? createAssemblyRepository();
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    const evidenceRegistry = options.evidenceRegistry, goalRegistry = options.goalRegistry, triggerRegistry = options.triggerRegistry, problemEngine = options.problemEngine;
    function boundaryCheck(decisionCase, context) {
      if (!decisionCase?.decisionId || !decisionCase?.security?.accessProof?.allowed) return failure("ADI_ASSEMBLY_CASE_UNSECURED", "A secured DecisionCase is required.");
      if (!context?.contextId || context.decisionId !== decisionCase.decisionId || context.tenantId !== decisionCase.tenantId || context.businessId !== decisionCase.businessId) return failure("ADI_ASSEMBLY_CONTEXT_MISMATCH", "DecisionContextEnvelope boundary does not match.");
      if (context.accessDecisionId !== decisionCase.security.accessProof.accessDecisionId) return failure("ADI_ASSEMBLY_ACCESS_MISMATCH", "Context authorization does not match the DecisionCase.");
      return success({ tenantId: decisionCase.tenantId, businessId: decisionCase.businessId, decisionId: decisionCase.decisionId });
    }
    async function assemble(input = {}) {
      const decisionCase = input.decisionCase, context = input.contextEnvelope;
      const boundary = boundaryCheck(decisionCase, context);
      if (!boundary.ok) return boundary;
      const q = boundary.data;
      const evidence = evidenceRegistry?.list(q)?.data ?? [];
      const goals = (decisionCase.goalIds ?? []).map((goalId) => goalRegistry?.get({ ...q, goalId })).filter((x) => x?.ok).map((x) => x.data);
      const triggers = (decisionCase.triggerIds ?? []).map((triggerId) => triggerRegistry?.get({ ...q, triggerId })).filter((x) => x?.ok).map((x) => x.data);
      let problems = (decisionCase.problemIds ?? []).map((problemId) => problemEngine?.get({ ...q, problemId })).filter((x) => x?.ok).map((x) => x.data);
      if (!problems.length && problemEngine) problems = problemEngine.list({ ...q, status: "open" }).data;
      const verificationFailures = [];
      for (const record2 of evidence) {
        const verified = await evidenceRegistry.verify({ ...q, evidenceId: record2.evidenceId });
        if (!verified.ok || !verified.data.valid) verificationFailures.push(record2.evidenceId);
      }
      const readiness = assessReadiness({ context, evidence, goals, triggers, problems, verificationFailures, requiredSourceTypes: input.requiredSourceTypes ?? [] });
      const assembledAt = now().toISOString();
      const digestInput = { decisionId: q.decisionId, contextId: context.contextId, evidence: evidence.map((x) => [x.evidenceId, x.contentHash]), goals: goals.map((x) => [x.goalId, x.version]), triggers: triggers.map((x) => [x.triggerId, x.version]), problems: problems.map((x) => [x.problemId, x.version]), readiness };
      let digest;
      try {
        digest = await sha256(digestInput);
      } catch (error) {
        return failure("ADI_ASSEMBLY_DIGEST_FAILED", "Assembly digest could not be generated.", { message: error.message });
      }
      const record = Object.freeze({ assemblyId: input.assemblyId ?? createId("assembly"), tenantId: q.tenantId, businessId: q.businessId, decisionId: q.decisionId, accessDecisionId: context.accessDecisionId, contextId: context.contextId, contextSummary: Object.freeze({ fragmentIds: Object.freeze(context.fragments.map((x) => x.fragmentId)), sourceTypes: Object.freeze([...new Set(context.fragments.map((x) => x.sourceType))]), quality: context.quality, conflictCount: context.conflicts?.length ?? 0, missingSourceTypes: Object.freeze([...context.missingSourceTypes ?? []]) }), evidenceRefs: Object.freeze(evidence.map((x) => Object.freeze({ evidenceId: x.evidenceId, contentHash: x.contentHash, quality: x.quality, freshness: x.freshness }))), goalRefs: Object.freeze(goals.map((x) => Object.freeze({ goalId: x.goalId, version: x.version, progressPercent: x.progressPercent }))), triggerRefs: Object.freeze(triggers.map((x) => Object.freeze({ triggerId: x.triggerId, version: x.version, severity: x.severity, status: x.status }))), problemRefs: Object.freeze(problems.map((x) => Object.freeze({ problemId: x.problemId, version: x.version, urgency: x.urgency, status: x.status }))), verificationFailures: Object.freeze(verificationFailures), readiness, assemblyDigest: digest, digestAlgorithm: "SHA-256", status: readiness.status, version: 1, assembledAt, updatedAt: assembledAt, schemaVersion: "1.0.0" });
      if (!repository.append(record)) return failure("ADI_ASSEMBLY_VERSION_CONFLICT", "Assembly could not be stored.");
      await emit("adi.analysis_case.assembled", { assemblyId: record.assemblyId, decisionId: record.decisionId, status: record.status, digest: record.assemblyDigest }, q);
      return success(record);
    }
    function get(q) {
      const r = repository.get(q);
      return r ? success(r) : failure("ADI_ASSEMBLY_NOT_FOUND", "Assembly was not found inside the requested boundary.");
    }
    function list(q) {
      return success(repository.list(q));
    }
    function history(q) {
      return success(repository.history(q));
    }
    async function verify(q) {
      const found = get(q);
      if (!found.ok) return found;
      const r = found.data;
      const digestInput = { decisionId: r.decisionId, contextId: r.contextId, evidence: r.evidenceRefs.map((x) => [x.evidenceId, x.contentHash]), goals: r.goalRefs.map((x) => [x.goalId, x.version]), triggers: r.triggerRefs.map((x) => [x.triggerId, x.version]), problems: r.problemRefs.map((x) => [x.problemId, x.version]), readiness: r.readiness };
      const actual = await sha256(digestInput);
      return success({ assemblyId: r.assemblyId, valid: actual === r.assemblyDigest, expectedDigest: r.assemblyDigest, actualDigest: actual });
    }
    return Object.freeze({ blockId: "ADI-11", version: "1.0.0", assemble, get, list, history, verify });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const services = { evidenceRegistry: runtime.getService("adi.evidence_registry"), goalRegistry: runtime.getService("adi.goal_registry"), triggerRegistry: runtime.getService("adi.trigger_registry"), problemEngine: runtime.getService("adi.problem_definition") };
    if (Object.values(services).some((x) => !x.ok)) return failure("ADI_ASSEMBLY_DEPENDENCY_REQUIRED", "ADI-07 through ADI-10 must be attached before ADI-11.");
    const engine = createAssemblyEngine({ ...options, createId: runtime.createId, emit: runtime.emit, ...Object.fromEntries(Object.entries(services).map(([k, v]) => [k, v.data])) });
    const service = runtime.registerService("adi.context_evidence_assembly", engine, { blockId: "ADI-11", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.analysis_case.assemble", (q) => engine.assemble(q)], ["adi.analysis_case.get", (q) => engine.get(q)], ["adi.analysis_case.list", (q) => engine.list(q)], ["adi.analysis_case.history", (q) => engine.history(q)], ["adi.analysis_case.verify", (q) => engine.verify(q)]];
    for (const [n, h] of routes) {
      const x = runtime.registerRoute(n, h, { blockId: "ADI-11" });
      if (!x.ok) return x;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-11", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-11", service: "adi.context_evidence_assembly", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-11"] = __adiBlockExports;
})(window);
