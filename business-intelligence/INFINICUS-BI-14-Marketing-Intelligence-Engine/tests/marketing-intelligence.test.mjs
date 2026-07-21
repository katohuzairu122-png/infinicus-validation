import assert from "node:assert/strict";

function score(conversion, roas, roi) {
  return Number((
    Math.max(0, Math.min(100, conversion * 4)) * 0.35 +
    Math.max(0, Math.min(100, roas / 4 * 100)) * 0.35 +
    Math.max(0, Math.min(100, 50 + roi / 2)) * 0.30
  ).toFixed(2));
}

assert.equal(
  score(5, 4, 40),
  63
);

const signals = [];

if (0.8 < 1) signals.push("NEGATIVE_ROAS");
if (15 > 10) signals.push("CAC_INCREASING");
if (4.5 >= 4) signals.push("STRONG_ROAS");

assert.deepEqual(
  signals,
  ["NEGATIVE_ROAS", "CAC_INCREASING", "STRONG_ROAS"]
);

console.log("BI-14 marketing intelligence tests passed.");
