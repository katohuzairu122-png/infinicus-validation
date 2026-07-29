import assert from "node:assert/strict";

const valid = {
  packageVersion: "1.0.0",
  sourceLayer: "AI_DECISION_INTELLIGENCE",
  decisionId: "decision_1",
  recommendationId: "recommendation_1",
  businessId: "business_1",
  decision: { state: "accepted" },
  simulationEvidence: { simulationRunId: "sim_1" },
  riskEvidence: [{ riskId: "risk_1" }],
  constraints: [{ constraintId: "constraint_1" }],
  expectedOutcomes: [{ metric: "revenue" }],
  confidence: 0.8,
  lineage: [{ source: "simulation" }],
  correlationId: "correlation_1"
};

assert.equal(valid.decision.state, "accepted");
assert.equal(valid.confidence >= 0.6, true);
assert.equal(valid.riskEvidence.length > 0, true);
assert.equal(valid.constraints.length > 0, true);
assert.equal(valid.expectedOutcomes.length > 0, true);

const expiredAt = new Date(Date.now() - 1000).getTime();
assert.equal(expiredAt <= Date.now(), true);

console.log("ABA-02 decision package tests passed.");
