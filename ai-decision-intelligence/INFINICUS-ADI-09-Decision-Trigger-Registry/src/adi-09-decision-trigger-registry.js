/* --- ai-decision-intelligence/INFINICUS-ADI-09-Decision-Trigger-Registry/src/adi-09-decision-trigger-registry.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/index.js
  var src_exports = {};
  __export(src_exports, {
    TRANSITIONS: () => TRANSITIONS,
    TRIGGER_SEVERITIES: () => TRIGGER_SEVERITIES,
    TRIGGER_STATUSES: () => TRIGGER_STATUSES,
    TRIGGER_TYPES: () => TRIGGER_TYPES,
    attachToADIRuntime: () => attachToADIRuntime,
    createTriggerContextProvider: () => createTriggerContextProvider,
    createTriggerRegistry: () => createTriggerRegistry,
    createTriggerRepository: () => createTriggerRepository
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/constants.js
  var TRIGGER_TYPES = Object.freeze(["manual", "threshold", "anomaly", "goal_variance", "risk", "opportunity", "simulation", "outcome_monitoring", "external_verified"]);
  var TRIGGER_SEVERITIES = Object.freeze(["info", "low", "medium", "high", "critical"]);
  var TRIGGER_STATUSES = Object.freeze(["open", "acknowledged", "linked", "resolved", "dismissed", "expired"]);
  var TRANSITIONS = Object.freeze({ open: ["acknowledged", "linked", "resolved", "dismissed", "expired"], acknowledged: ["linked", "resolved", "dismissed", "expired"], linked: ["resolved", "dismissed", "expired"], resolved: [], dismissed: [], expired: [] });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/repository.js
  function createTriggerRepository() {
    const histories = /* @__PURE__ */ new Map(), keys = /* @__PURE__ */ new Map();
    const boundary = (t, b) => `${t}::${b}`;
    return Object.freeze({ create(record) {
      if (histories.has(record.triggerId)) return false;
      histories.set(record.triggerId, [record]);
      return true;
    }, append(record) {
      const h = histories.get(record.triggerId);
      if (!h || record.version !== h.at(-1).version + 1) return false;
      h.push(record);
      return true;
    }, get({ triggerId, tenantId, businessId, version }) {
      const h = histories.get(triggerId);
      if (!h) return null;
      const r = version ? h.find((x) => x.version === version) : h.at(-1);
      return r?.tenantId === tenantId && r?.businessId === businessId ? r : null;
    }, history({ triggerId, tenantId, businessId }) {
      return (histories.get(triggerId) ?? []).filter((x) => x.tenantId === tenantId && x.businessId === businessId);
    }, list({ tenantId, businessId, status, severity, goalId }) {
      return [...histories.values()].map((h) => h.at(-1)).filter((x) => x.tenantId === tenantId && x.businessId === businessId && (!status || x.status === status) && (!severity || x.severity === severity) && (!goalId || x.goalId === goalId));
    }, dedupeGet({ tenantId, businessId, key }) {
      return keys.get(`${boundary(tenantId, businessId)}::${key}`) ?? null;
    }, dedupeSet({ tenantId, businessId, key, triggerId }) {
      if (key) keys.set(`${boundary(tenantId, businessId)}::${key}`, triggerId);
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/trigger-registry.js
  var id = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var text = (value) => typeof value === "string" ? value.trim() : "";
  function validate(input, update = false) {
    const errors = [];
    if (!text(input.tenantId)) errors.push("tenant_id_required");
    if (!text(input.businessId)) errors.push("business_id_required");
    if (!update && text(input.title).length < 3) errors.push("title_required");
    if (input.triggerType && !TRIGGER_TYPES.includes(input.triggerType)) errors.push("trigger_type_invalid");
    if (input.severity && !TRIGGER_SEVERITIES.includes(input.severity)) errors.push("severity_invalid");
    if (input.status && !TRIGGER_STATUSES.includes(input.status)) errors.push("status_invalid");
    if (input.observedAt && Number.isNaN(Date.parse(input.observedAt))) errors.push("observed_at_invalid");
    if (input.expiresAt && Number.isNaN(Date.parse(input.expiresAt))) errors.push("expires_at_invalid");
    return errors;
  }
  function createTriggerRegistry(options = {}) {
    const repository = options.repository ?? createTriggerRepository();
    const createId = options.createId ?? id;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    const resolveGoal = options.resolveGoal;
    async function create(input = {}) {
      const errors = validate(input);
      if (errors.length) return failure("ADI_TRIGGER_INVALID", "Trigger failed validation.", { errors });
      if (input.goalId && resolveGoal) {
        const goal = await resolveGoal({ goalId: input.goalId, tenantId: input.tenantId, businessId: input.businessId });
        if (!goal?.ok) return failure("ADI_TRIGGER_GOAL_INVALID", "Linked goal was not found inside the trigger boundary.");
      }
      const dedupeKey = input.idempotencyKey ?? input.signalFingerprint ?? null;
      if (dedupeKey) {
        const existingId = repository.dedupeGet({ tenantId: input.tenantId, businessId: input.businessId, key: dedupeKey });
        if (existingId) return get({ triggerId: existingId, tenantId: input.tenantId, businessId: input.businessId });
      }
      const createdAt = now().toISOString();
      const record = Object.freeze({ triggerId: input.triggerId ?? createId("trigger"), tenantId: input.tenantId, businessId: input.businessId, goalId: input.goalId ?? null, triggerType: input.triggerType ?? "manual", title: text(input.title), description: text(input.description), severity: input.severity ?? "medium", status: input.status ?? "open", observedAt: input.observedAt ?? createdAt, expiresAt: input.expiresAt ?? null, sourceType: input.sourceType ?? "manual", sourceRef: input.sourceRef ?? null, evidenceIds: Object.freeze([...input.evidenceIds ?? []]), signalFingerprint: input.signalFingerprint ?? null, acknowledgedBy: null, acknowledgedAt: null, resolutionReason: null, version: 1, createdAt, updatedAt: createdAt, schemaVersion: "1.0.0" });
      if (!repository.create(record)) return failure("ADI_TRIGGER_DUPLICATE_ID", "Trigger ID already exists.");
      repository.dedupeSet({ tenantId: record.tenantId, businessId: record.businessId, key: dedupeKey, triggerId: record.triggerId });
      await emit("adi.trigger.created", record, { tenantId: record.tenantId, businessId: record.businessId });
      return success(record);
    }
    function get(query) {
      const record = repository.get(query);
      return record ? success(record) : failure("ADI_TRIGGER_NOT_FOUND", "Trigger was not found inside the requested boundary.");
    }
    function list(query) {
      return success(repository.list(query));
    }
    function history(query) {
      return success(repository.history(query));
    }
    async function update(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      const errors = validate({ ...input, tenantId: found.data.tenantId, businessId: found.data.businessId }, true);
      if (errors.length) return failure("ADI_TRIGGER_INVALID", "Trigger update failed validation.", { errors });
      const next = { ...found.data };
      for (const field of ["title", "description", "severity", "goalId", "expiresAt", "sourceRef", "evidenceIds"]) {
        if (input[field] !== void 0) next[field] = field === "evidenceIds" ? Object.freeze([...input[field]]) : input[field];
      }
      next.version = found.data.version + 1;
      next.updatedAt = now().toISOString();
      const record = Object.freeze(next);
      if (!repository.append(record)) return failure("ADI_TRIGGER_VERSION_CONFLICT", "Trigger version could not be appended.");
      await emit("adi.trigger.updated", { triggerId: record.triggerId, version: record.version }, { tenantId: record.tenantId, businessId: record.businessId });
      return success(record);
    }
    async function setStatus(input = {}) {
      const found = get(input);
      if (!found.ok) return found;
      const status = input.status;
      if (!TRIGGER_STATUSES.includes(status) || !TRANSITIONS[found.data.status]?.includes(status)) return failure("ADI_TRIGGER_TRANSITION_INVALID", `Cannot transition ${found.data.status} to ${status}.`);
      const next = Object.freeze({ ...found.data, status, acknowledgedBy: status === "acknowledged" ? input.actorId ?? null : found.data.acknowledgedBy, acknowledgedAt: status === "acknowledged" ? now().toISOString() : found.data.acknowledgedAt, resolutionReason: ["resolved", "dismissed"].includes(status) ? input.reason ?? null : found.data.resolutionReason, version: found.data.version + 1, updatedAt: now().toISOString() });
      if (!repository.append(next)) return failure("ADI_TRIGGER_VERSION_CONFLICT", "Trigger version could not be appended.");
      await emit("adi.trigger.status.updated", { triggerId: next.triggerId, status: next.status, version: next.version }, { tenantId: next.tenantId, businessId: next.businessId });
      return success(next);
    }
    async function importLegacy(input) {
      return create({ ...input, tenantId: input.tenantId, sourceType: input.sourceType ?? "legacy_goal_registry" });
    }
    function exportLegacy(query) {
      const found = get(query);
      if (!found.ok) return found;
      const x = found.data;
      return success({ triggerId: x.triggerId, businessId: x.businessId, goalId: x.goalId, triggerType: x.triggerType, title: x.title, description: x.description, severity: x.severity, status: x.status, observedAt: x.observedAt, version: x.version });
    }
    return Object.freeze({ blockId: "ADI-09", version: "1.0.0", create, get, list, history, update, setStatus, importLegacy, exportLegacy });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/context-provider.js
  function createTriggerContextProvider(registry) {
    return Object.freeze({ async acquire({ decisionCase, boundary }) {
      const requested = decisionCase?.triggerIds ?? [];
      let triggers;
      if (requested.length) triggers = requested.map((triggerId) => registry.get({ triggerId, ...boundary })).filter((x) => x.ok).map((x) => x.data);
      else triggers = registry.list({ ...boundary, status: "open" }).data;
      return triggers.map((x) => ({ fragmentId: `trigger:${x.triggerId}:v${x.version}`, tenantId: x.tenantId, businessId: x.businessId, sourceType: "trigger_registry", scope: "trigger", recordId: x.triggerId, providerId: "adi09.trigger_registry", quality: x.evidenceIds.length ? "verified" : "unknown", observedAt: x.observedAt, schemaVersion: x.schemaVersion, sourceSystem: "infinicus_adi_trigger_registry", data: { ...x }, units: {} }));
    } });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-09-Decision-Trigger-Registry/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const req = ["registerService", "registerRoute", "getService", "emit", "createId", "success"];
    if (!runtime || req.some((n) => typeof runtime[n] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const context = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!context.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-09.");
    const goals = runtime.getService("adi.goal_registry");
    const registry = createTriggerRegistry({ ...options, createId: runtime.createId, emit: runtime.emit, resolveGoal: options.resolveGoal ?? (goals.ok ? (q) => goals.data.get(q) : void 0) });
    const service = runtime.registerService("adi.trigger_registry", registry, { blockId: "ADI-09", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.trigger.create", (q) => registry.create(q)], ["adi.trigger.get", (q) => registry.get(q)], ["adi.trigger.list", (q) => registry.list(q)], ["adi.trigger.history", (q) => registry.history(q)], ["adi.trigger.update", (q) => registry.update(q)], ["adi.trigger.status.update", (q) => registry.setStatus(q)], ["adi.trigger.legacy.import", (q) => registry.importLegacy(q)], ["adi.trigger.legacy.export", (q) => registry.exportLegacy(q)]];
    for (const [n, h] of routes) {
      const result = runtime.registerRoute(n, h, { blockId: "ADI-09" });
      if (!result.ok) return result;
    }
    const provider = context.data.providers.register({ providerId: "adi09.trigger_registry", sourceType: "trigger_registry", blockId: "ADI-09" }, createTriggerContextProvider(registry));
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-09", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-09", service: "adi.trigger_registry", providerId: "adi09.trigger_registry", routes: routes.map(([n]) => n) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-09"] = __adiBlockExports;
})(window);
