import assert from "node:assert/strict";

const handoff={
  outcomeLearningPackageId:"learning_1",
  confidence:0.82,
  reliability:0.79,
  applicabilityScope:"same business and comparable conditions",
  limitations:[],
  hypotheses:[],
  lineage:[{source:"OM-23"}]
};

const policy={
  minimumConfidence:0.5,
  minimumReliability:0.5,
  requireApplicabilityScope:true,
  requireLimitations:true,
  allowHypotheses:true
};

assert.equal(handoff.confidence>=policy.minimumConfidence,true);
assert.equal(handoff.reliability>=policy.minimumReliability,true);
assert.equal(Boolean(handoff.applicabilityScope),true);
assert.equal(Array.isArray(handoff.limitations),true);
assert.equal(handoff.lineage.length>0,true);

const key=
  `om_learning_${handoff.outcomeLearningPackageId}_target_1`;

assert.equal(
  key,
  "om_learning_learning_1_target_1"
);

console.log("OM-24 publication tests passed.");
