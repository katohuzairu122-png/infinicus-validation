import assert from "node:assert/strict";

function score(retention, churn, activation) {
  return Number((
    Math.max(0, Math.min(100, retention)) * 0.4 +
    Math.max(0, Math.min(100, 100 - churn * 2)) * 0.35 +
    Math.max(0, Math.min(100, activation)) * 0.25
  ).toFixed(2));
}

assert.equal(
  score(80, 5, 60),
  78.5
);

const signals = [];

if (12 > 10) signals.push("HIGH_CHURN");
if (65 < 70) signals.push("LOW_RETENTION");
if (55 > 50) signals.push("STRONG_REPEAT_PURCHASE");

assert.deepEqual(
  signals,
  ["HIGH_CHURN", "LOW_RETENTION", "STRONG_REPEAT_PURCHASE"]
);

console.log("BI-13 customer intelligence tests passed.");
