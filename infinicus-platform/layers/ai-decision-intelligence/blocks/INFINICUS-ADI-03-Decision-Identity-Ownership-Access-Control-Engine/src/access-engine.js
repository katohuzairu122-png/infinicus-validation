import { createAccessStore } from "./access-store.js";
import { normalizeIdentity } from "./identity.js";
import { PERMISSIONS } from "./constants.js";
import { success, failure } from "./result-envelope.js";

const localId = prefix => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;

export function createAccessControlEngine(options = {}) {
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
    let allowed = false; let reason = "identity_unresolved"; let roles = []; let permissions = [];

    if (identity) {
      if (!tenantId || !businessId || !decisionId) reason = "resource_invalid";
      else if (identity.tenantId !== tenantId) reason = "tenant_mismatch";
      else if (!identity.businessIds.includes(businessId)) reason = "business_mismatch";
      else if (store.isDenied({tenantId,businessId,subjectId:identity.subjectId},permission)) reason = "explicitly_denied";
      else {
        roles = store.rolesFor({tenantId,businessId,subjectId:identity.subjectId});
        permissions = store.permissionsFor({tenantId,businessId,subjectId:identity.subjectId});
        if (store.ownerOf(decisionId) === identity.subjectId && ["decision.view","decision.update"].includes(permission)) {
          allowed = true; reason = "owner_allowed";
        } else if (permissions.includes(permission)) { allowed = true; reason = "allowed_by_role"; }
        else reason = "permission_missing";
      }
    }

    const accessDecision = Object.freeze({
      accessDecisionId:createId("access"), allowed, reason, permission,
      subjectId:identity?.subjectId ?? null, subjectType:identity?.subjectType ?? null,
      tenantId, businessId, decisionId, roles:Object.freeze(roles), permissions:Object.freeze(permissions),
      evaluatedAt:new Date().toISOString(), traceId:context.traceId ?? input.traceId ?? null
    });
    await emit(`adi.access.${allowed ? "allowed" : "denied"}`, accessDecision, {tenantId,businessId,decisionId});
    return success(accessDecision);
  }

  async function secureDecisionCase(decisionCase, context = {}) {
    if (!decisionCase?.decisionId || !decisionCase?.tenantId || !decisionCase?.businessId) {
      return failure("ADI_DECISION_CASE_INVALID", "A canonical DecisionCase is required.");
    }
    const result = await authorize({resource:decisionCase, permission:"decision.update", traceId:decisionCase.traceId}, context);
    if (!result.ok || !result.data.allowed) return failure("ADI_DECISION_CASE_ACCESS_DENIED", "DecisionCase access was denied.", result.data ?? result.error);
    if (!store.ownerOf(decisionCase.decisionId)) store.setOwner(decisionCase.decisionId, result.data.subjectId);
    const secured = Object.freeze({
      ...decisionCase,
      security:Object.freeze({
        ownerId:store.ownerOf(decisionCase.decisionId), accessDecisionId:result.data.accessDecisionId,
        tenantBoundary:decisionCase.tenantId, businessBoundary:decisionCase.businessId,
        securedAt:new Date().toISOString(), securitySchemaVersion:"1.0.0",
        accessProof:Object.freeze({
          accessDecisionId:result.data.accessDecisionId,allowed:result.data.allowed,
          permission:result.data.permission,subjectId:result.data.subjectId,
          tenantId:result.data.tenantId,businessId:result.data.businessId,
          decisionId:result.data.decisionId,evaluatedAt:result.data.evaluatedAt,
          traceId:result.data.traceId
        })
      })
    });
    await emit("adi.decision_case.secured", {decisionId:secured.decisionId,security:secured.security}, {
      tenantId:secured.tenantId,businessId:secured.businessId,decisionId:secured.decisionId,traceId:secured.traceId
    });
    return success(secured);
  }

  return Object.freeze({blockId:"ADI-03",version:"1.0.0",store,authorize,secureDecisionCase});
}
