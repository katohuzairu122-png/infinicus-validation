import assert from "node:assert/strict";

const weights={
  evidenceConfidence:0.25,
  evidenceReliability:0.2,
  classificationConfidence:0.15,
  applicabilityConfidence:0.2,
  provenanceCompleteness:0.1,
  lineageCompleteness:0.1
};

const dimensions={
  evidenceConfidence:0.9,
  evidenceReliability:0.85,
  classificationConfidence:0.8,
  applicabilityConfidence:0.75,
  provenanceCompleteness:1,
  lineageCompleteness:1
};

const base=
  Object.entries(weights).reduce(
    (sum,[key,weight])=>
      sum+dimensions[key]*weight,
    0
  );

const confidence=base-0.05-0.15;

assert.equal(Number(base.toFixed(3)),0.865);
assert.equal(Number(confidence.toFixed(3)),0.665);

const eligibility=
  confidence>=0.75
    ? "eligible"
    : confidence>=0.5
      ? "review_required"
      : "ineligible";

assert.equal(eligibility,"review_required");

console.log("CL-06 confidence and reliability tests passed.");
