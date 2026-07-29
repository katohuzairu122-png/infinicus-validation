import assert from "node:assert/strict";

const add = values => values.reduce((a, b) => a + b, 0);
const percentage = values => values[1] ? values[0] / values[1] * 100 : 0;

assert.equal(add([10, 20, 30]), 60);
assert.equal(percentage([25, 100]), 25);

function classify(value) {
  if (value >= 1000) return "high";
  if (value >= 500) return "medium";
  return "low";
}

assert.equal(classify(1200), "high");
assert.equal(classify(700), "medium");
assert.equal(classify(100), "low");

console.log("BI-07 data transformation tests passed.");
