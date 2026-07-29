import assert from "node:assert/strict";

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

assert.equal(
  median([1, 3, 2]),
  2
);

assert.equal(
  median([1, 2, 3, 4]),
  2.5
);

const records = [
  { amount: 10, region: "A" },
  { amount: 20, region: "A" },
  { amount: 5, region: "B" }
];

const sumA =
  records
    .filter(record => record.region === "A")
    .reduce((sum, record) => sum + record.amount, 0);

assert.equal(sumA, 30);

const grossMargin =
  1000 ? (1000 - 600) / 1000 : null;

assert.equal(grossMargin, 0.4);

console.log("BI-10 metric calculation tests passed.");
