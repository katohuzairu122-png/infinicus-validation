/* --- ai-decision-intelligence/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/adi-10-business-problem-definition-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    PROBLEM_SOURCES: () => PROBLEM_SOURCES,
    PROBLEM_STATUSES: () => PROBLEM_STATUSES,
    PROBLEM_URGENCIES: () => PROBLEM_URGENCIES,
    TRANSITIONS: () => TRANSITIONS,
    attachToADIRuntime: () => attachToADIRuntime,
    createProblemContextProvider: () => createProblemContextProvider,
    createProblemDefinitionEngine: () => createProblemDefinitionEngine,
    createProblemRepository: () => createProblemRepository
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/constants.js
  var PROBLEM_STATUSES = Object.freeze(["draft", "open", "in_analysis", "resolved", "cancelled", "superseded"]);
  var PROBLEM_URGENCIES = Object.freeze(["low", "medium", "high", "critical"]);
  var PROBLEM_SOURCES = Object.freeze(["manual", "trigger", "goal_variance", "business_intelligence", "simulation", "outcome_monitoring", "continuous_learning"]);
  var TRANSITIONS = Object.freeze({ draft: ["open", "cancelled"], open: ["in_analysis", "resolved", "cancelled", "superseded"], in_analysis: ["resolved", "cancelled", "superseded"], resolved: [], cancelled: [], superseded: [] });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/repository.js
  function createProblemRepository() {
    const histories = /* @__PURE__ */ new Map(), keys = /* @__PURE__ */ new Map();
    const boundary = (t, b) => `${t}::${b}`;
    return Object.freeze({ create(r) {
      if (histories.has(r.problemId)) return false;
      histories.set(r.problemId, [r]);
      return true;
    }, append(r) {
      const h = histories.get(r.problemId);
      if (!h || r.version !== h.at(-1).version + 1) return false;
      h.push(r);
      return true;
    }, get({ problemId, tenantId, businessId, version }) {
      const h = histories.get(problemId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, history({ problemId, tenantId, businessId }) {
      return (histories.get(problemId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    }, list({ tenantId, businessId, status, urgency, decisionId }) {
      return [...histories.values()].map((h) => h.at(-1)).filter((x) => x.tenantId === tenantId && x.businessId === businessId && (!status || x.status === status) && (!urgency || x.urgency === urgency) && (!decisionId || x.decisionId === decisionId));
    }, keyGet({ tenantId, businessId, key }) {
      return keys.get(`${boundary(tenantId, businessId)}::${key}`) ?? null;
    }, keySet({ tenantId, businessId, key, problemId }) {
      if (key) keys.set(`${boundary(tenantId, businessId)}::${key}`, problemId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/problem-engine.js
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var text = (v) => typeof v === "string" ? v.trim() : "";
  var textList = (v) => Array.isArray(v) ? v.map(text).filter(Boolean) : typeof v === "string" ? v.split(/\r?\n/).map(text).filter(Boolean) : [];
  function validate(input, update = false) {
    const errors = [];
    if (!text(input.tenantId)) errors.push("tenant_id_required");
    if (!text(input.businessId)) errors.push("business_id_required");
    if (!update && text(input.title).length < 3) errors.push("title_required");
    if (!update && text(input.statement).length < 20) errors.push("statement_too_short");
    if (!update && text(input.desiredOutcome).length < 10) errors.push("desired_outcome_required");
    if (input.urgency && !PROBLEM_URGENCIES.includes(input.urgency)) errors.push("urgency_invalid");
    if (input.status && !PROBLEM_STATUSES.includes(input.status)) errors.push("status_invalid");
    if (input.source && !PROBLEM_SOURCES.includes(input.source)) errors.push("source_invalid");
    if (input.decisionDeadline && Number.isNaN(Date.parse(input.decisionDeadline))) errors.push("decision_deadline_invalid");
    return errors;
  }
  function createProblemDefinitionEngine(options = {}) {
    const repository = options.repository ?? createProblemRepository();
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    const resolveGoal = options.resolveGoal, resolveTrigger = options.resolveTrigger, resolveEvidence = options.resolveEvidence;
    async function validateReferences(input) {
      const errors = [];
      if (input.goalId && resolveGoal) {
        const r = await resolveGoal({ goalId: input.goalId, tenantId: input.tenantId, businessId: input.businessId });
        if (!r?.ok) errors.push("goal_reference_invalid");
      }
      for (const triggerId of input.triggerIds ?? (input.triggerId ? [input.triggerId] : [])) {
        if (resolveTrigger) {
          const r = await resolveTrigger({ triggerId, tenantId: input.tenantId, businessId: input.businessId });
          if (!r?.ok) errors.push(`trigger_reference_invalid:${triggerId}`);
        }
      }
      for (const evidenceId of input.evidenceIds ?? []) {
        if (resolveEvidence) {
          const r = await resolveEvidence({ evidenceId, tenantId: input.tenantId, businessId: input.businessId, decisionId: input.decisionId });
          if (!r?.ok) errors.push(`evidence_reference_invalid:${evidenceId}`);
        }
      }
      return errors;
    }
    async function create(input = {}) {
      const errors = validate(input);
      errors.push(...await validateReferences(input));
      if (errors.length) return failure("ADI_PROBLEM_INVALID", "Problem definition failed validation.", { errors });
      if (input.idempotencyKey) {
        const existing = repository.keyGet({ tenantId: input.tenantId, businessId: input.businessId, key: input.idempotencyKey });
        if (existing) return get({ problemId: existing, tenantId: input.tenantId, businessId: input.businessId });
      }
      const framedAt = now().toISOString();
      const record = Object.freeze({ problemId: input.problemId ?? createId("problem"), tenantId: input.tenantId, businessId: input.businessId, decisionId: input.decisionId ?? null, goalId: input.goalId ?? null, triggerId: input.triggerId ?? input.triggerIds?.[0] ?? null, triggerIds: Object.freeze([...input.triggerIds ?? (input.triggerId ? [input.triggerId] : [])]), evidenceIds: Object.freeze([...input.evidenceIds ?? []]), title: text(input.title), statement: text(input.statement), decisionQuestion: text(input.decisionQuestion), desiredOutcome: text(input.desiredOutcome), scope: text(input.scope), constraints: Object.freeze(textList(input.constraints)), successCriteria: Object.freeze(textList(input.successCriteria)), assumptions: Object.freeze(textList(input.assumptions)), symptoms: Object.freeze(textList(input.symptoms)), exclusions: Object.freeze(textList(input.exclusions)), rootCauseHypotheses: Object.freeze(textList(input.rootCauseHypotheses)), urgency: input.urgency ?? "medium", status: input.status ?? "open", source: input.source ?? "manual", decisionDeadline: input.decisionDeadline ?? null, framedBy: input.framedBy ?? null, framedAt, version: 1, createdAt: framedAt, updatedAt: framedAt, schemaVersion: "1.0.0" });
      if (!repository.create(record)) return failure("ADI_PROBLEM_DUPLICATE_ID", "Problem ID already exists.");
      repository.keySet({ tenantId: record.tenantId, businessId: record.businessId, key: input.idempotencyKey, problemId: record.problemId });
      await emit("adi.problem.created", record, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    function get(q) {
      const r = repository.get(q);
      return r ? success(r) : failure("ADI_PROBLEM_NOT_FOUND", "Problem was not found inside the requested boundary.");
    }
    function list(q) {
      return success(repository.list(q));
    }
    function history(q) {
      return success(repository.history(q));
    }
    async function update(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      const candidate = { ...found.data };
      for (const field of ["title", "statement", "decisionQuestion", "desiredOutcome", "scope", "constraints", "successCriteria", "assumptions", "symptoms", "exclusions", "rootCauseHypotheses", "urgency", "decisionDeadline", "goalId", "triggerId", "triggerIds", "evidenceIds"]) {
        if (input[field] !== void 0) candidate[field] = ["constraints", "successCriteria", "assumptions", "symptoms", "exclusions", "rootCauseHypotheses"].includes(field) ? Object.freeze(textList(input[field])) : ["triggerIds", "evidenceIds"].includes(field) ? Object.freeze([...input[field]]) : input[field];
      }
      candidate.triggerIds = candidate.triggerIds ?? (candidate.triggerId ? [candidate.triggerId] : []);
      const errors = validate({ ...candidate, tenantId: found.data.tenantId, businessId: found.data.businessId }, true);
      errors.push(...await validateReferences(candidate));
      if (errors.length) return failure("ADI_PROBLEM_INVALID", "Problem update failed validation.", { errors });
      candidate.version = found.data.version + 1;
      candidate.updatedAt = now().toISOString();
      const record = Object.freeze(candidate);
      if (!repository.append(record)) return failure("ADI_PROBLEM_VERSION_CONFLICT", "Problem version could not be appended.");
      await emit("adi.problem.updated", { problemId: record.problemId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function setStatus(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      if (!PROBLEM_STATUSES.includes(input.status) || !TRANSITIONS[found.data.status]?.includes(input.status)) return failure("ADI_PROBLEM_TRANSITION_INVALID", `Cannot transition ${found.data.status} to ${input.status}.`);
      const record = Object.freeze({ ...found.data, status: input.status, resolution: input.status === "resolved" ? text(input.resolution) : found.data.resolution ?? null, version: found.data.version + 1, updatedAt: now().toISOString() });
      if (!repository.append(record)) return failure("ADI_PROBLEM_VERSION_CONFLICT", "Problem version could not be appended.");
      await emit("adi.problem.status.updated", { problemId: record.problemId, status: record.status, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function importLegacy(input) {
      return create({ ...input, tenantId: input.tenantId, triggerIds: input.triggerId ? [input.triggerId] : [], source: PROBLEM_SOURCES.includes(input.source) ? input.source : "manual" });
    }
    function exportLegacy(q) {
      const found = get(q);
      if (!found.ok) return found;
      const x = found.data;
      return success({ problemId: x.problemId, businessId: x.businessId, goalId: x.goalId, triggerId: x.triggerId, title: x.title, statement: x.statement, desiredOutcome: x.desiredOutcome, scope: x.scope, constraints: [...x.constraints], successCriteria: [...x.successCriteria], assumptions: [...x.assumptions], urgency: x.urgency, status: x.status, framedAt: x.framedAt, source: x.source, version: x.version });
    }
    return Object.freeze({ blockId: "ADI-10", version: "1.0.0", create, get, list, history, update, setStatus, importLegacy, exportLegacy });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/context-provider.js
  function createProblemContextProvider(engine) {
    return Object.freeze({ async acquire({ decisionCase, boundary }) {
      const requested = decisionCase?.problemIds ?? [];
      let items;
      if (requested.length) items = requested.map((problemId) => engine.get({ problemId, ...boundary })).filter((x) => x.ok).map((x) => x.data);
      else items = engine.list({ ...boundary, status: "open", decisionId: decisionCase?.decisionId }).data;
      return items.map((x) => ({ fragmentId: `problem:${x.problemId}:v${x.version}`, tenantId: x.tenantId, businessId: x.businessId, sourceType: "problem_registry", scope: "problem", recordId: x.problemId, providerId: "adi10.problem_definition", quality: x.evidenceIds.length ? "verified" : "unknown", observedAt: x.updatedAt, schemaVersion: x.schemaVersion, sourceSystem: "infinicus_adi_problem_definition", data: { ...x }, units: {} }));
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const context = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!context.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-10.");
    const goals = runtime.getService("adi.goal_registry"), triggers = runtime.getService("adi.trigger_registry"), evidence = runtime.getService("adi.evidence_registry");
    const engine = createProblemDefinitionEngine({ ...options, createId: runtime.createId, emit: runtime.emit, resolveGoal: options.resolveGoal ?? (goals.ok ? (q) => goals.data.get(q) : void 0), resolveTrigger: options.resolveTrigger ?? (triggers.ok ? (q) => triggers.data.get(q) : void 0), resolveEvidence: options.resolveEvidence ?? (evidence.ok ? (q) => evidence.data.get(q) : void 0) });
    const service = runtime.registerService("adi.problem_definition", engine, { blockId: "ADI-10", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.problem.create", (q) => engine.create(q)], ["adi.problem.get", (q) => engine.get(q)], ["adi.problem.list", (q) => engine.list(q)], ["adi.problem.history", (q) => engine.history(q)], ["adi.problem.update", (q) => engine.update(q)], ["adi.problem.status.update", (q) => engine.setStatus(q)], ["adi.problem.legacy.import", (q) => engine.importLegacy(q)], ["adi.problem.legacy.export", (q) => engine.exportLegacy(q)]];
    for (const [n, h] of routes) {
      const result = runtime.registerRoute(n, h, { blockId: "ADI-10" });
      if (!result.ok) return result;
    }
    const provider = context.data.providers.register({ providerId: "adi10.problem_definition", sourceType: "problem_registry", blockId: "ADI-10" }, createProblemContextProvider(engine));
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-10", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-10", service: "adi.problem_definition", providerId: "adi10.problem_definition", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-10"] = __adiBlockExports;
})(window);
