/* --- ai-decision-intelligence/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/adi-03-decision-identity-ownership-access-control-engine.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/index.js
  var src_exports = {};
  __export(src_exports, {
    ACCESS_REASONS: () => ACCESS_REASONS,
    PERMISSIONS: () => PERMISSIONS,
    SUBJECT_TYPES: () => SUBJECT_TYPES,
    SYSTEM_ROLES: () => SYSTEM_ROLES,
    attachToADIRuntime: () => attachToADIRuntime,
    createAccessControlEngine: () => createAccessControlEngine,
    createAccessStore: () => createAccessStore,
    normalizeIdentity: () => normalizeIdentity
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/constants.js
  var PERMISSIONS = Object.freeze([
    "decision.create",
    "decision.view",
    "decision.update",
    "decision.assign",
    "decision.analyse",
    "decision.escalate",
    "decision.submit_to_aba",
    "decision.audit"
  ]);
  var SYSTEM_ROLES = Object.freeze({
    decision_viewer: ["decision.view"],
    decision_contributor: ["decision.create", "decision.view", "decision.update"],
    decision_analyst: ["decision.view", "decision.update", "decision.analyse"],
    decision_manager: ["decision.create", "decision.view", "decision.update", "decision.assign", "decision.analyse", "decision.escalate"],
    governance_reviewer: ["decision.view", "decision.escalate", "decision.submit_to_aba", "decision.audit"],
    system_service: ["decision.create", "decision.view", "decision.update", "decision.analyse"]
  });
  var SUBJECT_TYPES = Object.freeze(["user", "service", "agent"]);
  var ACCESS_REASONS = Object.freeze([
    "allowed_by_role",
    "owner_allowed",
    "identity_unresolved",
    "tenant_mismatch",
    "business_mismatch",
    "permission_missing",
    "explicitly_denied",
    "resource_invalid"
  ]);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/access-store.js
  var scopeKey = (tenantId, businessId, subjectId) => `${tenantId}::${businessId}::${subjectId}`;
  var denyKey = (tenantId, businessId, subjectId, permission) => `${scopeKey(tenantId, businessId, subjectId)}::${permission}`;
  function createAccessStore() {
    const roles = new Map(Object.entries(SYSTEM_ROLES).map(([id, permissions]) => [id, Object.freeze([...permissions])]));
    const assignments = /* @__PURE__ */ new Map();
    const owners = /* @__PURE__ */ new Map();
    const denies = /* @__PURE__ */ new Set();
    return Object.freeze({
      registerRole(roleId, permissions) {
        if (!roleId || roles.has(roleId) || !Array.isArray(permissions) || permissions.some((item) => !PERMISSIONS.includes(item))) return false;
        roles.set(roleId, Object.freeze([...new Set(permissions)]));
        return true;
      },
      assignRole({ tenantId, businessId, subjectId, roleId }) {
        if (!roles.has(roleId) || !tenantId || !businessId || !subjectId) return false;
        const key = scopeKey(tenantId, businessId, subjectId);
        const set = assignments.get(key) ?? /* @__PURE__ */ new Set();
        set.add(roleId);
        assignments.set(key, set);
        return true;
      },
      rolesFor({ tenantId, businessId, subjectId }) {
        return [...assignments.get(scopeKey(tenantId, businessId, subjectId)) ?? []];
      },
      permissionsFor(subject) {
        return [...new Set(this.rolesFor(subject).flatMap((roleId) => roles.get(roleId) ?? []))];
      },
      setOwner(resourceId, subjectId) {
        if (!resourceId || !subjectId) return false;
        owners.set(resourceId, subjectId);
        return true;
      },
      ownerOf(resourceId) {
        return owners.get(resourceId) ?? null;
      },
      deny({ tenantId, businessId, subjectId, permission }) {
        denies.add(denyKey(tenantId, businessId, subjectId, permission));
      },
      isDenied({ tenantId, businessId, subjectId }, permission) {
        return denies.has(denyKey(tenantId, businessId, subjectId, permission));
      },
      listRoles() {
        return [...roles].map(([roleId, permissions]) => ({ roleId, permissions: [...permissions] }));
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/identity.js
  function normalizeIdentity(raw) {
    if (!raw || raw.authenticated !== true || typeof raw.subjectId !== "string") return null;
    const identity = {
      subjectId: raw.subjectId.trim(),
      subjectType: String(raw.subjectType ?? "user").toLowerCase(),
      tenantId: String(raw.tenantId ?? "").trim(),
      businessIds: Object.freeze([...raw.businessIds ?? []].map(String)),
      authenticatedAt: raw.authenticatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      assuranceLevel: raw.assuranceLevel ?? "standard"
    };
    if (identity.subjectId.length < 3 || identity.tenantId.length < 3 || !SUBJECT_TYPES.includes(identity.subjectType)) return null;
    return Object.freeze(identity);
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({
    ok: false,
    data: null,
    error: Object.freeze({ code, message, details }),
    meta: Object.freeze({ ...meta })
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/access-engine.js
  var localId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  function createAccessControlEngine(options = {}) {
    const resolveIdentity = options.resolveIdentity ?? (async () => null);
    const store = options.store ?? createAccessStore();
    const emit = options.emit ?? (async () => success());
    const createId = options.createId ?? localId;
    async function authorize(input = {}, context = {}) {
      const permission = String(input.permission ?? "");
      if (!PERMISSIONS.includes(permission)) return failure("ADI_ACCESS_PERMISSION_INVALID", "A supported permission is required.");
      const identity = normalizeIdentity(await resolveIdentity(context));
      const decisionId = input.resource?.decisionId ?? input.decisionId ?? null;
      const tenantId = input.resource?.tenantId ?? input.tenantId ?? null;
      const businessId = input.resource?.businessId ?? input.businessId ?? null;
      let allowed = false;
      let reason = "identity_unresolved";
      let roles = [];
      let permissions = [];
      if (identity) {
        if (!tenantId || !businessId || !decisionId) reason = "resource_invalid";
        else if (identity.tenantId !== tenantId) reason = "tenant_mismatch";
        else if (!identity.businessIds.includes(businessId)) reason = "business_mismatch";
        else if (store.isDenied({ tenantId, businessId, subjectId: identity.subjectId }, permission)) reason = "explicitly_denied";
        else {
          roles = store.rolesFor({ tenantId, businessId, subjectId: identity.subjectId });
          permissions = store.permissionsFor({ tenantId, businessId, subjectId: identity.subjectId });
          if (store.ownerOf(decisionId) === identity.subjectId && ["decision.view", "decision.update"].includes(permission)) {
            allowed = true;
            reason = "owner_allowed";
          } else if (permissions.includes(permission)) {
            allowed = true;
            reason = "allowed_by_role";
          } else reason = "permission_missing";
        }
      }
      const accessDecision = Object.freeze({
        accessDecisionId: createId("access"),
        allowed,
        reason,
        permission,
        subjectId: identity?.subjectId ?? null,
        subjectType: identity?.subjectType ?? null,
        tenantId,
        businessId,
        decisionId,
        roles: Object.freeze(roles),
        permissions: Object.freeze(permissions),
        evaluatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        traceId: context.traceId ?? input.traceId ?? null
      });
      await emit(`adi.access.${allowed ? "allowed" : "denied"}`, accessDecision, { tenantId, businessId, decisionId });
      return success(accessDecision);
    }
    async function secureDecisionCase(decisionCase, context = {}) {
      if (!decisionCase?.decisionId || !decisionCase?.tenantId || !decisionCase?.businessId) {
        return failure("ADI_DECISION_CASE_INVALID", "A canonical DecisionCase is required.");
      }
      const result = await authorize({ resource: decisionCase, permission: "decision.update", traceId: decisionCase.traceId }, context);
      if (!result.ok || !result.data.allowed) return failure("ADI_DECISION_CASE_ACCESS_DENIED", "DecisionCase access was denied.", result.data ?? result.error);
      if (!store.ownerOf(decisionCase.decisionId)) store.setOwner(decisionCase.decisionId, result.data.subjectId);
      const secured = Object.freeze({
        ...decisionCase,
        security: Object.freeze({
          ownerId: store.ownerOf(decisionCase.decisionId),
          accessDecisionId: result.data.accessDecisionId,
          tenantBoundary: decisionCase.tenantId,
          businessBoundary: decisionCase.businessId,
          securedAt: (/* @__PURE__ */ new Date()).toISOString(),
          securitySchemaVersion: "1.0.0",
          accessProof: Object.freeze({
            accessDecisionId: result.data.accessDecisionId,
            allowed: result.data.allowed,
            permission: result.data.permission,
            subjectId: result.data.subjectId,
            tenantId: result.data.tenantId,
            businessId: result.data.businessId,
            decisionId: result.data.decisionId,
            evaluatedAt: result.data.evaluatedAt,
            traceId: result.data.traceId
          })
        })
      });
      await emit("adi.decision_case.secured", { decisionId: secured.decisionId, security: secured.security }, {
        tenantId: secured.tenantId,
        businessId: secured.businessId,
        decisionId: secured.decisionId,
        traceId: secured.traceId
      });
      return success(secured);
    }
    return Object.freeze({ blockId: "ADI-03", version: "1.0.0", store, authorize, secureDecisionCase });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "emit", "createId", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const engine = createAccessControlEngine({ ...options, emit: runtime.emit, createId: runtime.createId });
    const service = runtime.registerService("adi.access_control", engine, { blockId: "ADI-03", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [
      ["adi.access.authorize", (request, context) => engine.authorize(request, context)],
      ["adi.decision_case.secure", (request, context) => engine.secureDecisionCase(request.decisionCase ?? request, context)]
    ];
    for (const [name, handler] of routes) {
      const result = runtime.registerRoute(name, handler, { blockId: "ADI-03" });
      if (!result.ok) return result;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-03", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-03", service: "adi.access_control", routes: routes.map(([name]) => name) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-03"] = __adiBlockExports;
})(window);
