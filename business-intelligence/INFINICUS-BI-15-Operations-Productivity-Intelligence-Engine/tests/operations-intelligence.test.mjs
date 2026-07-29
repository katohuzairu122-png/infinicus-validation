import assert from "node:assert/strict";

function score(utilization, productivityGrowth, sla, defectRate) {
  const utilizationScore =
    Math.max(0, Math.min(100, 100 - Math.abs(utilization - 80) * 2));

  const productivityScore =
    Math.max(0, Math.min(100, 50 + productivityGrowth * 2));

  const serviceScore =
    Math.max(0, Math.min(100, sla));

  const qualityScore =
    Math.max(0, Math.min(100, 100 - defectRate * 5));

  return Number((
    utilizationScore * 0.25 +
    productivityScore * 0.25 +
    serviceScore * 0.25 +
    qualityScore * 0.25
  ).toFixed(2));
}

assert.equal(
  score(80, 10, 95, 2),
  88.75
);

const signals = [];

if (97 > 95) signals.push("OVER_CAPACITY");
if (88 < 90) signals.push("SLA_BREACH_RISK");
if (12 > 10) signals.push("PRODUCTIVITY_GAIN");

assert.deepEqual(
  signals,
  ["OVER_CAPACITY", "SLA_BREACH_RISK", "PRODUCTIVITY_GAIN"]
);

console.log("BI-15 operations intelligence tests passed.");
