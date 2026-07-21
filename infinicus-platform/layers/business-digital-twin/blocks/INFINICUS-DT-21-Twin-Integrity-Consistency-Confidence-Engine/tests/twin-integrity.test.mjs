import assert from "node:assert/strict";

const states = [
  { sourceType: "observed", confidence: 0.9 },
  { sourceType: "calculated", confidence: 0.8 },
  { sourceType: "inferred", confidence: 0.7 },
  { sourceType: "assumed", confidence: 0.5 }
];

const weights = {
  observed: 1,
  calculated: 0.9,
  inferred: 0.7,
  assumed: 0.4
};

const confidence =
  states.reduce(
    (sum, state) =>
      sum +
      state.confidence *
      weights[state.sourceType],
    0
  ) / states.length;

assert.equal(
  Number(confidence.toFixed(4)),
  0.5775
);

const domains = new Set([
  "financial.cash",
  "operations.capacity",
  "market.demand"
].map(key => key.split(".")[0]));

assert.equal(domains.has("financial"), true);
assert.equal(domains.has("risk"), false);

console.log("DT-21 twin integrity tests passed.");
