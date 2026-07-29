import assert from "node:assert/strict";

function inRange(value, minimum, maximum) {
  if (minimum != null && value < minimum) return false;
  if (maximum != null && value > maximum) return false;
  return true;
}

assert.equal(
  inRange(500, 0, 1000),
  true
);

assert.equal(
  inRange(1500, 0, 1000),
  false
);

const lowRiskRule = {
  riskSeverities:
    ["low", "medium"]
};

assert.equal(
  lowRiskRule.riskSeverities.includes("medium"),
  true
);

assert.equal(
  lowRiskRule.riskSeverities.includes("critical"),
  false
);

const specificRule = {
  actionTypeIds:
    ["price_adjustment"],
  riskSeverities:
    ["high"],
  reversibilityClasses:
    ["reversible"]
};

const specificity =
  [
    specificRule.actionTypeIds,
    specificRule.riskSeverities,
    specificRule.reversibilityClasses
  ].filter(values =>
    values.length
  ).length;

assert.equal(
  specificity,
  3
);

console.log("ABA-06 approval policy tests passed.");
