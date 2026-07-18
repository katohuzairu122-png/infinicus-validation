import assert from "node:assert/strict";

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values) {
  const avg = mean(values);
  return Math.sqrt(
    values.reduce(
      (sum, value) => sum + Math.pow(value - avg, 2),
      0
    ) / values.length
  );
}

function z(value, baseline) {
  return (value - mean(baseline)) / std(baseline);
}

const baseline = [10, 11, 9, 10, 10];
const score = z(20, baseline);

assert.equal(
  score > 3,
  true
);

const prioritized = [
  { code: "A", priorityScore: 50 },
  { code: "A", priorityScore: 75 },
  { code: "B", priorityScore: 40 }
];

const best = new Map();

for (const signal of prioritized) {
  if (
    !best.has(signal.code) ||
    signal.priorityScore >
    best.get(signal.code).priorityScore
  ) {
    best.set(signal.code, signal);
  }
}

assert.equal(best.size, 2);
assert.equal(best.get("A").priorityScore, 75);

console.log("BI-20 anomaly signal detection tests passed.");
