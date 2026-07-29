export const PERMISSIONS = Object.freeze([
  "decision.create", "decision.view", "decision.update", "decision.assign",
  "decision.analyse", "decision.escalate", "decision.submit_to_aba", "decision.audit"
]);

export const SYSTEM_ROLES = Object.freeze({
  decision_viewer: ["decision.view"],
  decision_contributor: ["decision.create", "decision.view", "decision.update"],
  decision_analyst: ["decision.view", "decision.update", "decision.analyse"],
  decision_manager: ["decision.create", "decision.view", "decision.update", "decision.assign", "decision.analyse", "decision.escalate"],
  governance_reviewer: ["decision.view", "decision.escalate", "decision.submit_to_aba", "decision.audit"],
  system_service: ["decision.create", "decision.view", "decision.update", "decision.analyse"]
});

export const SUBJECT_TYPES = Object.freeze(["user", "service", "agent"]);
export const ACCESS_REASONS = Object.freeze([
  "allowed_by_role", "owner_allowed", "identity_unresolved", "tenant_mismatch",
  "business_mismatch", "permission_missing", "explicitly_denied", "resource_invalid"
]);
