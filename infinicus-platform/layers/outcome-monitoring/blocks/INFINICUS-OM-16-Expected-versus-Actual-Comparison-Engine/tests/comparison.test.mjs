import assert from "node:assert/strict";

const expected=120;
const actual=108;
const absoluteGap=actual-expected;
const percentageGap=(absoluteGap/Math.abs(expected))*100;
const achievementRatio=actual/expected;

assert.equal(absoluteGap,-12);
assert.equal(Number(percentageGap.toFixed(2)),-10);
assert.equal(Number(achievementRatio.toFixed(2)),0.9);

const statuses=[
  "achieved",
  "acceptable",
  "underperforming",
  "failed",
  "low_confidence"
];

assert.equal(statuses.includes("acceptable"),true);

console.log("OM-16 comparison tests passed.");
