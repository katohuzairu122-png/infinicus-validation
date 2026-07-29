/* --- ai-decision-intelligence/INFINICUS-ADI-08-Business-Goal-Registry/src/adi-08-business-goal-registry.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/index.js
  var src_exports = {};
  __export(src_exports, {
    GOAL_DIRECTIONS: () => GOAL_DIRECTIONS,
    GOAL_PRIORITIES: () => GOAL_PRIORITIES,
    GOAL_STATUSES: () => GOAL_STATUSES,
    GOAL_TYPES: () => GOAL_TYPES,
    attachToADIRuntime: () => attachToADIRuntime,
    calculateProgress: () => calculateProgress,
    createGoalContextProvider: () => createGoalContextProvider,
    createGoalRegistry: () => createGoalRegistry,
    createGoalRepository: () => createGoalRepository,
    inferDirection: () => inferDirection
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/constants.js
  var GOAL_TYPES = Object.freeze(["growth", "financial", "customer", "market", "operations", "risk", "compliance", "impact", "custom"]);
  var GOAL_PRIORITIES = Object.freeze(["low", "medium", "high", "critical"]);
  var GOAL_STATUSES = Object.freeze(["draft", "active", "paused", "achieved", "cancelled", "archived"]);
  var GOAL_DIRECTIONS = Object.freeze(["increase", "decrease", "maintain"]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/progress.js
  function inferDirection(baseline, target) {
    return target > baseline ? "increase" : target < baseline ? "decrease" : "maintain";
  }
  function calculateProgress({ baselineValue, currentValue, targetValue, direction = inferDirection(baselineValue, targetValue), tolerance = 0 }) {
    let raw = 0;
    if (direction === "increase") {
      const range = targetValue - baselineValue;
      raw = range <= 0 ? 0 : (currentValue - baselineValue) / range * 100;
    } else if (direction === "decrease") {
      const range = baselineValue - targetValue;
      raw = range <= 0 ? 0 : (baselineValue - currentValue) / range * 100;
    } else raw = Math.abs(currentValue - targetValue) <= Math.abs(tolerance) ? 100 : 0;
    return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/repository.js
  function createGoalRepository() {
    const histories = /* @__PURE__ */ new Map(), idempotency = /* @__PURE__ */ new Map();
    const boundary = (tenantId, businessId) => `${tenantId}::${businessId}`;
    return Object.freeze({
      create(goal) {
        if (histories.has(goal.goalId)) return false;
        histories.set(goal.goalId, [goal]);
        return true;
      },
      append(goal) {
        const history = histories.get(goal.goalId);
        if (!history || goal.version !== history.at(-1).version + 1) return false;
        history.push(goal);
        return true;
      },
      get({ goalId, tenantId, businessId, version }) {
        const history = histories.get(goalId);
        if (!history) return null;
        const record = version ? history.find((item) => item.version === version) : history.at(-1);
        return record?.tenantId === tenantId && record?.businessId === businessId ? record : null;
      },
      history({ goalId, tenantId, businessId }) {
        return (histories.get(goalId) ?? []).filter((item) => item.tenantId === tenantId && item.businessId === businessId);
      },
      list({ tenantId, businessId, status }) {
        return [...histories.values()].map((history) => history.at(-1)).filter((item) => item.tenantId === tenantId && item.businessId === businessId && (!status || item.status === status));
      },
      idempotentGet({ tenantId, businessId, key }) {
        return idempotency.get(`${boundary(tenantId, businessId)}::${key}`) ?? null;
      },
      idempotentSet({ tenantId, businessId, key, goalId }) {
        if (key) idempotency.set(`${boundary(tenantId, businessId)}::${key}`, goalId);
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/goal-registry.js
  var localId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var clean = (value) => typeof value === "string" ? value.trim() : "";
  function validate(input, isUpdate = false) {
    const errors = [];
    if (!clean(input.tenantId)) errors.push("tenant_id_required");
    if (!clean(input.businessId)) errors.push("business_id_required");
    if (!isUpdate && clean(input.title).length < 3) errors.push("title_required");
    for (const field of ["baselineValue", "currentValue", "targetValue"]) {
      if (!isUpdate && !Number.isFinite(Number(input[field]))) errors.push(`${field}_invalid`);
      if (isUpdate && input[field] !== void 0 && !Number.isFinite(Number(input[field]))) errors.push(`${field}_invalid`);
    }
    if (!isUpdate && !clean(input.unit)) errors.push("unit_required");
    if (input.type && !GOAL_TYPES.includes(input.type)) errors.push("type_invalid");
    if (input.priority && !GOAL_PRIORITIES.includes(input.priority)) errors.push("priority_invalid");
    if (input.status && !GOAL_STATUSES.includes(input.status)) errors.push("status_invalid");
    if (input.direction && !GOAL_DIRECTIONS.includes(input.direction)) errors.push("direction_invalid");
    if (input.targetDate && Number.isNaN(Date.parse(input.targetDate))) errors.push("target_date_invalid");
    return errors;
  }
  function createGoalRegistry(options = {}) {
    const repository = options.repository ?? createGoalRepository();
    const createId = options.createId ?? localId;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    async function create(input = {}) {
      const errors = validate(input);
      if (errors.length) return failure("ADI_GOAL_INVALID", "Goal failed validation.", { errors });
      if (input.idempotencyKey) {
        const existingId = repository.idempotentGet({ tenantId: input.tenantId, businessId: input.businessId, key: input.idempotencyKey });
        if (existingId) return get({ goalId: existingId, tenantId: input.tenantId, businessId: input.businessId });
      }
      const baseline = Number(input.baselineValue), current = Number(input.currentValue), target = Number(input.targetValue), direction = input.direction ?? inferDirection(baseline, target), createdAt = now().toISOString();
      const goal = Object.freeze({ goalId: input.goalId ?? createId("goal"), tenantId: input.tenantId, businessId: input.businessId, type: input.type ?? "growth", title: clean(input.title), description: clean(input.description), baselineValue: baseline, currentValue: current, targetValue: target, unit: clean(input.unit), direction, tolerance: Number(input.tolerance ?? 0), priority: input.priority ?? "medium", status: input.status ?? "active", progressPercent: calculateProgress({ baselineValue: baseline, currentValue: current, targetValue: target, direction, tolerance: Number(input.tolerance ?? 0) }), targetDate: input.targetDate ?? null, ownerId: input.ownerId ?? null, version: 1, createdAt, updatedAt: createdAt, schemaVersion: "1.0.0" });
      if (!repository.create(goal)) return failure("ADI_GOAL_DUPLICATE_ID", "Goal ID already exists.");
      repository.idempotentSet({ tenantId: goal.tenantId, businessId: goal.businessId, key: input.idempotencyKey, goalId: goal.goalId });
      await emit("adi.goal.created", goal, { tenantId: goal.tenantId, businessId: goal.businessId });
      return success(goal);
    }
    function get(query) {
      const goal = repository.get(query);
      return goal ? success(goal) : failure("ADI_GOAL_NOT_FOUND", "Goal was not found inside the requested boundary.");
    }
    function list(query) {
      return success(repository.list(query));
    }
    function history(query) {
      return success(repository.history(query));
    }
    async function update(input = {}) {
      if (!input.goalId) return failure("ADI_GOAL_ID_REQUIRED", "Goal ID is required.");
      const current = get(input);
      if (!current.ok) return current;
      const errors = validate({ ...input, tenantId: current.data.tenantId, businessId: current.data.businessId }, true);
      if (errors.length) return failure("ADI_GOAL_INVALID", "Goal update failed validation.", { errors });
      const allowed = ["type", "title", "description", "currentValue", "targetValue", "unit", "direction", "tolerance", "priority", "status", "targetDate", "ownerId"];
      const values = { ...current.data };
      for (const field of allowed) {
        if (input[field] !== void 0) values[field] = ["baselineValue", "currentValue", "targetValue", "tolerance"].includes(field) ? Number(input[field]) : input[field];
      }
      values.direction = input.direction ?? inferDirection(values.baselineValue, values.targetValue);
      values.progressPercent = calculateProgress(values);
      values.version = current.data.version + 1;
      values.updatedAt = now().toISOString();
      const next = Object.freeze(values);
      if (!repository.append(next)) return failure("ADI_GOAL_VERSION_CONFLICT", "Goal version could not be appended.");
      await emit("adi.goal.updated", { goalId: next.goalId, version: next.version, status: next.status, progressPercent: next.progressPercent }, { tenantId: next.tenantId, businessId: next.businessId });
      return success(next);
    }
    async function setStatus(input) {
      return update({ ...input, status: input.status });
    }
    async function importLegacy(input = {}) {
      return create({ ...input, tenantId: input.tenantId, type: input.type ?? "growth", direction: input.direction ?? inferDirection(Number(input.baselineValue ?? 0), Number(input.targetValue ?? 0)), schemaVersion: void 0 });
    }
    function exportLegacy(query) {
      const found = get(query);
      if (!found.ok) return found;
      const goal = found.data;
      return success({ goalId: goal.goalId, businessId: goal.businessId, type: goal.type, title: goal.title, description: goal.description, baselineValue: goal.baselineValue, currentValue: goal.currentValue, targetValue: goal.targetValue, unit: goal.unit, priority: goal.priority, status: goal.status, progressPercent: goal.progressPercent, version: goal.version });
    }
    return Object.freeze({ blockId: "ADI-08", version: "1.0.0", create, get, list, history, update, setStatus, importLegacy, exportLegacy });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/context-provider.js
  function createGoalContextProvider(registry) {
    return Object.freeze({
      async acquire({ decisionCase, boundary }) {
        const requested = decisionCase?.goalIds ?? [];
        let goals;
        if (requested.length) {
          goals = requested.map((goalId) => registry.get({ goalId, ...boundary })).filter((result) => result.ok).map((result) => result.data);
        } else goals = registry.list({ ...boundary, status: "active" }).data;
        return goals.map((goal) => ({ fragmentId: `goal:${goal.goalId}:v${goal.version}`, tenantId: goal.tenantId, businessId: goal.businessId, sourceType: "goal_registry", scope: "goal", recordId: goal.goalId, providerId: "adi08.goal_registry", quality: "verified", observedAt: goal.updatedAt, schemaVersion: goal.schemaVersion, sourceSystem: "infinicus_adi_goal_registry", data: { ...goal }, units: { baselineValue: goal.unit, currentValue: goal.unit, targetValue: goal.unit, progressPercent: "percent" } }));
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-08-Business-Goal-Registry/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const contextService = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!contextService.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-08.");
    const registry = createGoalRegistry({ ...options, emit: runtime.emit, createId: runtime.createId });
    const service = runtime.registerService("adi.goal_registry", registry, { blockId: "ADI-08", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.goal.create", (request) => registry.create(request)], ["adi.goal.get", (request) => registry.get(request)], ["adi.goal.list", (request) => registry.list(request)], ["adi.goal.history", (request) => registry.history(request)], ["adi.goal.update", (request) => registry.update(request)], ["adi.goal.status.update", (request) => registry.setStatus(request)], ["adi.goal.legacy.import", (request) => registry.importLegacy(request)], ["adi.goal.legacy.export", (request) => registry.exportLegacy(request)]];
    for (const [name, handler] of routes) {
      const result = runtime.registerRoute(name, handler, { blockId: "ADI-08" });
      if (!result.ok) return result;
    }
    const provider = contextService.data.providers.register({ providerId: "adi08.goal_registry", sourceType: "goal_registry", blockId: "ADI-08" }, createGoalContextProvider(registry));
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-08", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-08", service: "adi.goal_registry", providerId: "adi08.goal_registry", routes: routes.map(([name]) => name) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-08"] = __adiBlockExports;
})(window);
