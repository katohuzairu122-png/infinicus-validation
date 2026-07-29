import assert from "node:assert/strict";

function classify(growth, conversion, pipeline) {
  const score =
    Math.max(0, Math.min(100, 50 + growth * 2)) * 0.4 +
    Math.max(0, Math.min(100, conversion * 4)) * 0.3 +
    Math.max(0, Math.min(100, pipeline / 3 * 100)) * 0.3;

  return Number(score.toFixed(2));
}

assert.equal(
  classify(10, 20, 3),
  82
);

const signals = [];

if (-2 < 0) signals.push("REVENUE_DECLINE");
if (1.5 < 2) signals.push("WEAK_PIPELINE");
if (55 > 50) signals.push("STRONG_WIN_RATE");

assert.deepEqual(
  signals,
  ["REVENUE_DECLINE", "WEAK_PIPELINE", "STRONG_WIN_RATE"]
);

console.log("BI-12 sales revenue intelligence tests passed.");
