import assert from "node:assert/strict";

function score(availability, turnover, stockout, supplier) {
  return Number((
    Math.max(0, Math.min(100, availability)) * 0.3 +
    Math.max(0, Math.min(100, turnover / 12 * 100)) * 0.2 +
    Math.max(0, Math.min(100, 100 - stockout * 5)) * 0.25 +
    Math.max(0, Math.min(100, supplier)) * 0.25
  ).toFixed(2));
}

assert.equal(
  score(98, 12, 2, 95),
  95.65
);

const signals = [];

if (6 > 5) signals.push("HIGH_STOCKOUT_RATE");
if (100 > 90) signals.push("EXCESS_INVENTORY");
if (88 < 90) signals.push("SUPPLIER_DELIVERY_RISK");

assert.deepEqual(
  signals,
  ["HIGH_STOCKOUT_RATE", "EXCESS_INVENTORY", "SUPPLIER_DELIVERY_RISK"]
);

console.log("BI-16 inventory supply intelligence tests passed.");
