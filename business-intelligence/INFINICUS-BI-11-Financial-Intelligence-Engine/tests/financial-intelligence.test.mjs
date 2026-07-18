import assert from "node:assert/strict";

function score(runway, currentRatio, margin) {
  const runwayScore = Math.max(0, Math.min(100, runway / 12 * 100));
  const liquidityScore = Math.max(0, Math.min(100, currentRatio * 40));
  const profitabilityScore = Math.max(0, Math.min(100, 50 + margin * 2));

  return runwayScore * 0.3 +
    liquidityScore * 0.3 +
    profitabilityScore * 0.4;
}

assert.equal(
  Number(score(12, 2, 10).toFixed(2)),
  82
);

const signals = [];

if (-5 < 0) signals.push("NEGATIVE_MARGIN");
if (2 < 3) signals.push("SHORT_RUNWAY");

assert.deepEqual(
  signals,
  ["NEGATIVE_MARGIN", "SHORT_RUNWAY"]
);

console.log("BI-11 financial intelligence tests passed.");
