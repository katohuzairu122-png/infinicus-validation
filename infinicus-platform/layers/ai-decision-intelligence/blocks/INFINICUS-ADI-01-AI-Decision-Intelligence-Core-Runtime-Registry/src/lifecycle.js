import { success, failure } from "./result-envelope.js";

export const DECISION_STATES = Object.freeze([
  "received", "validated", "analysing", "generating_options", "simulating",
  "scoring", "recommended", "handed_to_aba", "needs_data", "escalated",
  "rejected", "failed", "cancelled"
]);

const TRANSITIONS = Object.freeze({
  received: ["validated", "needs_data", "rejected", "cancelled", "failed"],
  validated: ["analysing", "needs_data", "escalated", "cancelled", "failed"],
  needs_data: ["validated", "rejected", "cancelled"],
  analysing: ["generating_options", "needs_data", "escalated", "failed", "cancelled"],
  generating_options: ["simulating", "scoring", "needs_data", "failed", "cancelled"],
  simulating: ["scoring", "needs_data", "failed", "cancelled"],
  scoring: ["recommended", "escalated", "failed", "cancelled"],
  recommended: ["handed_to_aba", "escalated", "cancelled"],
  escalated: ["analysing", "rejected", "cancelled"],
  handed_to_aba: [], rejected: [], failed: [], cancelled: []
});

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function transition(entity, to, reason = null) {
  if (!entity || !DECISION_STATES.includes(entity.status)) {
    return failure("ADI_LIFECYCLE_ENTITY_INVALID", "Entity has no valid ADI status.");
  }
  if (!DECISION_STATES.includes(to) || !canTransition(entity.status, to)) {
    return failure("ADI_LIFECYCLE_TRANSITION_INVALID", `Cannot transition ${entity.status} to ${to}.`);
  }
  const at = new Date().toISOString();
  return success(Object.freeze({
    ...entity, status: to, updatedAt: at,
    statusHistory: Object.freeze([...(entity.statusHistory ?? []), Object.freeze({ from: entity.status, to, reason, at })])
  }));
}

export const lifecycle = Object.freeze({ states: DECISION_STATES, canTransition, transition });
