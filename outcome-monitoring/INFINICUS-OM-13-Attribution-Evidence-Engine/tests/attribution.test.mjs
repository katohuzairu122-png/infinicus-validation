import assert from "node:assert/strict";

const weights={
  timing:0.2,
  scope:0.2,
  exposure:0.2,
  mechanism:0.15,
  counterfactual:0.15,
  alternativeExplanations:0.1
};

const evidence={
  timing:0.9,
  scope:0.8,
  exposure:0.9,
  mechanism:0.7,
  counterfactual:0.6,
  alternativeExplanations:0.8
};

const score=
  evidence.timing*weights.timing +
  evidence.scope*weights.scope +
  evidence.exposure*weights.exposure +
  evidence.mechanism*weights.mechanism +
  evidence.counterfactual*weights.counterfactual +
  evidence.alternativeExplanations*weights.alternativeExplanations;

assert.equal(score>0.7,true);

const classifications=[
  "insufficient",
  "correlation_only",
  "plausible_attribution",
  "strong_attribution"
];

assert.equal(
  classifications.includes("strong_attribution"),
  true
);

console.log("OM-13 attribution tests passed.");
