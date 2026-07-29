export const REQUEST_SOURCES = Object.freeze([
  "human", "business_intelligence", "business_digital_twin", "simulation_engine",
  "outcome_monitoring", "continuous_learning", "system"
]);

export const DECISION_TYPES = Object.freeze([
  "problem", "opportunity", "risk_response", "goal_based", "trigger_generated",
  "simulation_warning", "intelligence_alert", "corrective_action", "reassessment"
]);

export const URGENCY_LEVELS = Object.freeze(["low", "medium", "high", "critical"]);
export const SCOPE_LEVELS = Object.freeze(["team", "function", "business", "portfolio", "ecosystem"]);
export const VALIDATION_STATUSES = Object.freeze([
  "accepted", "accepted_with_warnings", "needs_information", "duplicate",
  "unauthorized", "unsupported", "rejected"
]);
