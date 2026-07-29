import { SUBJECT_TYPES } from "./constants.js";

export function normalizeIdentity(raw) {
  if (!raw || raw.authenticated !== true || typeof raw.subjectId !== "string") return null;
  const identity = {
    subjectId:raw.subjectId.trim(), subjectType:String(raw.subjectType ?? "user").toLowerCase(),
    tenantId:String(raw.tenantId ?? "").trim(), businessIds:Object.freeze([...(raw.businessIds ?? [])].map(String)),
    authenticatedAt:raw.authenticatedAt ?? new Date().toISOString(), assuranceLevel:raw.assuranceLevel ?? "standard"
  };
  if (identity.subjectId.length < 3 || identity.tenantId.length < 3 || !SUBJECT_TYPES.includes(identity.subjectType)) return null;
  return Object.freeze(identity);
}
