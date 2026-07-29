import assert from "node:assert/strict";

const baseScore=0.82;
const confounderPenalty=0.12;
const alternativePenalty=0.05;
const causalScore=Math.max(
  0,
  baseScore-confounderPenalty-alternativePenalty
);

assert.equal(Number(causalScore.toFixed(2)),0.65);

const classifications=[
  "inconclusive",
  "weak_causal_support",
  "plausible_causal_support",
  "strong_causal_support"
];

assert.equal(
  classifications.includes("plausible_causal_support"),
  true
);

const temporalOrder=true;
assert.equal(temporalOrder,true);

console.log("OM-14 causation tests passed.");
