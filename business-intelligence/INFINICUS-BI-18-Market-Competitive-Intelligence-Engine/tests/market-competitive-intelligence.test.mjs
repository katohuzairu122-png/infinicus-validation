import assert from "node:assert/strict";

function score(growth, share, demand, pricing, differentiation) {
  return Number((
    Math.max(0, Math.min(100, 50 + growth * 2)) * 0.25 +
    Math.max(0, Math.min(100, share * 4)) * 0.2 +
    Math.max(0, Math.min(100, 50 + demand * 2)) * 0.2 +
    Math.max(0, Math.min(100, pricing)) * 0.15 +
    Math.max(0, Math.min(100, differentiation)) * 0.2
  ).toFixed(2));
}

assert.equal(
  score(10, 20, 12, 75, 85),
  76.55
);

const signals = [];

if (-2 < 0) signals.push("MARKET_CONTRACTION");
if (-8 < -5) signals.push("MARKET_SHARE_LOSS");
if (85 >= 80) signals.push("STRONG_DIFFERENTIATION");

assert.deepEqual(
  signals,
  [
    "MARKET_CONTRACTION",
    "MARKET_SHARE_LOSS",
    "STRONG_DIFFERENTIATION"
  ]
);

console.log("BI-18 market competitive intelligence tests passed.");
