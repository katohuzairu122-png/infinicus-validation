/* --- ai-decision-intelligence/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/adi-12-decision-objectives-constraints-criteria-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    CONSTRAINT_TYPES: () => CONSTRAINT_TYPES,
    CRITERION_DIRECTIONS: () => CRITERION_DIRECTIONS,
    FRAMEWORK_STATUSES: () => FRAMEWORK_STATUSES,
    OBJECTIVE_PRIORITIES: () => OBJECTIVE_PRIORITIES,
    OPERATORS: () => OPERATORS,
    attachToADIRuntime: () => attachToADIRuntime,
    createFrameworkEngine: () => createFrameworkEngine,
    createFrameworkRepository: () => createFrameworkRepository,
    normalizeCriteria: () => normalizeCriteria,
    validateFrameworkInput: () => validateFrameworkInput
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/repository.js
  function createFrameworkRepository() {
    const histories = /* @__PURE__ */ new Map(), byAssembly = /* @__PURE__ */ new Map();
    return Object.freeze({ create(r) {
      if (histories.has(r.frameworkId)) return false;
      histories.set(r.frameworkId, [r]);
      byAssembly.set(`${r.tenantId}::${r.businessId}::${r.assemblyId}`, r.frameworkId);
      return true;
    }, append(r) {
      const h = histories.get(r.frameworkId);
      if (!h || r.version !== h.at(-1).version + 1) return false;
      h.push(r);
      return true;
    }, get({ frameworkId, tenantId, businessId, version }) {
      const h = histories.get(frameworkId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, findByAssembly({ assemblyId, tenantId, businessId }) {
      const id2 = byAssembly.get(`${tenantId}::${businessId}::${assemblyId}`);
      return id2 ? histories.get(id2).at(-1) : null;
    }, list({ tenantId, businessId, decisionId, status }) {
      return [...histories.values()].map((h) => h.at(-1)).filter((x) => x.tenantId === tenantId && x.businessId === businessId && (!decisionId || x.decisionId === decisionId) && (!status || x.status === status));
    }, history({ frameworkId, tenantId, businessId }) {
      return (histories.get(frameworkId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/constants.js
  var FRAMEWORK_STATUSES = Object.freeze(["draft", "validated", "locked", "superseded"]);
  var OBJECTIVE_PRIORITIES = Object.freeze(["low", "medium", "high", "critical"]);
  var CONSTRAINT_TYPES = Object.freeze(["hard", "soft", "regulatory", "budget", "time", "capacity", "policy", "ethical"]);
  var OPERATORS = Object.freeze(["<=", ">=", "=", "<", ">", "in", "not_in", "contains"]);
  var CRITERION_DIRECTIONS = Object.freeze(["maximize", "minimize", "target", "threshold", "qualitative"]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/validator.js
  var text = (v) => typeof v === "string" ? v.trim() : "";
  function validateFrameworkInput(input) {
    const errors = [];
    if (!Array.isArray(input.objectives) || !input.objectives.length) errors.push("objective_required");
    if (!Array.isArray(input.criteria) || !input.criteria.length) errors.push("criterion_required");
    for (const [x, i] of (input.objectives ?? []).map((x2, i2) => [x2, i2])) {
      if (!text(x.title) || !text(x.desiredOutcome)) errors.push(`objective_invalid:${i}`);
      if (x.priority && !OBJECTIVE_PRIORITIES.includes(x.priority)) errors.push(`objective_priority_invalid:${i}`);
    }
    for (const [x, i] of (input.constraints ?? []).map((x2, i2) => [x2, i2])) {
      if (!text(x.description) || !CONSTRAINT_TYPES.includes(x.type) || !OPERATORS.includes(x.operator)) errors.push(`constraint_invalid:${i}`);
      if (x.value === void 0) errors.push(`constraint_value_required:${i}`);
      if (typeof x.value === "number" && !text(x.unit)) errors.push(`constraint_unit_required:${i}`);
    }
    for (const [x, i] of (input.criteria ?? []).map((x2, i2) => [x2, i2])) {
      if (!text(x.name) || !CRITERION_DIRECTIONS.includes(x.direction) || !Number.isFinite(Number(x.weight)) || Number(x.weight) < 0) errors.push(`criterion_invalid:${i}`);
      if (["maximize", "minimize", "target", "threshold"].includes(x.direction) && !text(x.unit)) errors.push(`criterion_unit_required:${i}`);
    }
    const total = (input.criteria ?? []).reduce((s, x) => s + Number(x.weight || 0), 0);
    if ((input.criteria ?? []).length && total <= 0) errors.push("criterion_weight_total_invalid");
    return Object.freeze(errors);
  }
  function normalizeCriteria(criteria) {
    const total = criteria.reduce((s, x) => s + Number(x.weight), 0);
    return Object.freeze(criteria.map((x) => Object.freeze({ ...x, weight: Number(x.weight), normalizedWeight: Math.round(Number(x.weight) / total * 1e6) / 1e6 })));
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/framework-engine.js
  var id = (p) => `${p}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var freezeList = (x) => Object.freeze(structuredClone(x));
  function createFrameworkEngine(options = {}) {
    const repository = options.repository ?? createFrameworkRepository();
    const assemblyEngine = options.assemblyEngine;
    const problemEngine = options.problemEngine;
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    async function create(input = {}) {
      if (!input.assemblyId || !input.tenantId || !input.businessId) return failure("ADI_FRAMEWORK_BOUNDARY_REQUIRED", "Assembly and business boundaries are required.");
      const assembly = assemblyEngine?.get({ assemblyId: input.assemblyId, tenantId: input.tenantId, businessId: input.businessId });
      if (!assembly?.ok) return failure("ADI_FRAMEWORK_ASSEMBLY_INVALID", "ADI-11 assembly was not found.");
      if (assembly.data.status !== "ready" && !input.governanceOverride) return failure("ADI_FRAMEWORK_ASSEMBLY_NOT_READY", "Only a ready assembly may create a framework without a governance override.");
      const existing = repository.findByAssembly(input);
      if (existing) return success(existing, { duplicate: true });
      const errors = validateFrameworkInput(input);
      if (errors.length) return failure("ADI_FRAMEWORK_INVALID", "Evaluation framework failed validation.", { errors });
      const createdAt = now().toISOString();
      const record = Object.freeze({ frameworkId: input.frameworkId ?? createId("framework"), assemblyId: input.assemblyId, assemblyDigest: assembly.data.assemblyDigest, tenantId: input.tenantId, businessId: input.businessId, decisionId: assembly.data.decisionId, problemId: input.problemId ?? assembly.data.problemRefs?.[0]?.problemId ?? null, objectives: freezeList(input.objectives.map((x, i) => ({ objectiveId: x.objectiveId ?? createId("objective"), title: x.title, desiredOutcome: x.desiredOutcome, metric: x.metric ?? null, targetValue: x.targetValue ?? null, unit: x.unit ?? null, priority: x.priority ?? "medium", goalId: x.goalId ?? null, evidenceIds: [...x.evidenceIds ?? []], sequence: i + 1 }))), constraints: freezeList((input.constraints ?? []).map((x, i) => ({ constraintId: x.constraintId ?? createId("constraint"), type: x.type, description: x.description, metric: x.metric ?? null, operator: x.operator, value: structuredClone(x.value), unit: x.unit ?? null, hard: x.hard ?? ["hard", "regulatory", "policy", "ethical"].includes(x.type), evidenceIds: [...x.evidenceIds ?? []], sequence: i + 1 }))), criteria: normalizeCriteria(input.criteria.map((x, i) => ({ criterionId: x.criterionId ?? createId("criterion"), name: x.name, description: x.description ?? "", direction: x.direction, weight: Number(x.weight), metric: x.metric ?? null, targetValue: x.targetValue ?? null, threshold: x.threshold ?? null, unit: x.unit ?? null, evidenceIds: [...x.evidenceIds ?? []], sequence: i + 1 }))), stakeholderIds: Object.freeze([...input.stakeholderIds ?? []]), weightingMethod: input.weightingMethod ?? "direct_supplied_weights", governanceOverride: input.governanceOverride ?? null, status: "draft", version: 1, createdAt, updatedAt: createdAt, schemaVersion: "1.0.0" });
      if (!repository.create(record)) return failure("ADI_FRAMEWORK_DUPLICATE_ID", "Framework ID already exists.");
      await emit("adi.evaluation_framework.created", { frameworkId: record.frameworkId, decisionId: record.decisionId }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    function get(q) {
      const r = repository.get(q);
      return r ? success(r) : failure("ADI_FRAMEWORK_NOT_FOUND", "Framework was not found inside the requested boundary.");
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
      if (found.data.status === "locked") return failure("ADI_FRAMEWORK_LOCKED", "Locked frameworks cannot be changed.");
      const candidate = { ...found.data };
      for (const field of ["objectives", "constraints", "criteria", "stakeholderIds", "weightingMethod"]) {
        if (input[field] !== void 0) candidate[field] = input[field];
      }
      const errors = validateFrameworkInput(candidate);
      if (errors.length) return failure("ADI_FRAMEWORK_INVALID", "Framework update failed validation.", { errors });
      candidate.objectives = freezeList(candidate.objectives);
      candidate.constraints = freezeList(candidate.constraints);
      candidate.criteria = normalizeCriteria(candidate.criteria);
      candidate.version = found.data.version + 1;
      candidate.status = "draft";
      candidate.updatedAt = now().toISOString();
      const record = Object.freeze(candidate);
      if (!repository.append(record)) return failure("ADI_FRAMEWORK_VERSION_CONFLICT", "Framework version could not be appended.");
      await emit("adi.evaluation_framework.updated", { frameworkId: record.frameworkId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function setStatus(input, status) {
      const found = get(input);
      if (!found.ok) return found;
      const current = found.data.status;
      const allowed = { draft: ["validated"], validated: ["locked", "draft"], locked: ["superseded"], superseded: [] };
      if (!FRAMEWORK_STATUSES.includes(status) || !allowed[current]?.includes(status)) return failure("ADI_FRAMEWORK_TRANSITION_INVALID", `Cannot transition ${current} to ${status}.`);
      const record = Object.freeze({ ...found.data, status, version: found.data.version + 1, updatedAt: now().toISOString(), validatedAt: status === "validated" ? now().toISOString() : found.data.validatedAt ?? null, lockedAt: status === "locked" ? now().toISOString() : found.data.lockedAt ?? null });
      if (!repository.append(record)) return failure("ADI_FRAMEWORK_VERSION_CONFLICT", "Framework version could not be appended.");
      await emit(`adi.evaluation_framework.${status}`, { frameworkId: record.frameworkId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId, decisionId: record.decisionId });
      return success(record);
    }
    async function fromProblem(input = {}) {
      const problem = problemEngine?.get({ problemId: input.problemId, tenantId: input.tenantId, businessId: input.businessId });
      if (!problem?.ok) return failure("ADI_FRAMEWORK_PROBLEM_INVALID", "Problem definition was not found.");
      const p = problem.data;
      return create({ ...input, objectives: [{ title: p.title, desiredOutcome: p.desiredOutcome, priority: p.urgency === "critical" ? "critical" : "high", goalId: p.goalId, evidenceIds: p.evidenceIds }], constraints: p.constraints.map((description) => ({ type: "soft", description, operator: "contains", value: description, unit: null, evidenceIds: p.evidenceIds })), criteria: input.criteria });
    }
    return Object.freeze({ blockId: "ADI-12", version: "1.0.0", create, get, list, history, update, validate: (q) => setStatus(q, "validated"), lock: (q) => setStatus(q, "locked"), supersede: (q) => setStatus(q, "superseded"), fromProblem });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const assembly = runtime.getService("adi.context_evidence_assembly"), problems = runtime.getService("adi.problem_definition");
    if (!assembly.ok || !problems.ok) return failure("ADI_FRAMEWORK_DEPENDENCY_REQUIRED", "ADI-10 and ADI-11 must be attached before ADI-12.");
    const engine = createFrameworkEngine({ ...options, assemblyEngine: assembly.data, problemEngine: problems.data, createId: runtime.createId, emit: runtime.emit });
    const service = runtime.registerService("adi.evaluation_framework", engine, { blockId: "ADI-12", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.evaluation_framework.create", (q) => engine.create(q)], ["adi.evaluation_framework.from_problem", (q) => engine.fromProblem(q)], ["adi.evaluation_framework.get", (q) => engine.get(q)], ["adi.evaluation_framework.list", (q) => engine.list(q)], ["adi.evaluation_framework.history", (q) => engine.history(q)], ["adi.evaluation_framework.update", (q) => engine.update(q)], ["adi.evaluation_framework.validate", (q) => engine.validate(q)], ["adi.evaluation_framework.lock", (q) => engine.lock(q)], ["adi.evaluation_framework.supersede", (q) => engine.supersede(q)]];
    for (const [n, h] of routes) {
      const x = runtime.registerRoute(n, h, { blockId: "ADI-12" });
      if (!x.ok) return x;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-12", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-12", service: "adi.evaluation_framework", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-12"] = __adiBlockExports;
})(window);
