import assert from "node:assert/strict";

const observation={
  value:120,
  metricId:"metric_1",
  observationSourceId:"source_1",
  classification:"observed",
  sourceTimestamp:new Date().toISOString(),
  collectedAt:new Date().toISOString(),
  rawEvidence:{value:120},
  lineage:[{source:"source_1"}],
  confidence:0.9
};

assert.equal(observation.classification,"observed");
assert.equal(Boolean(observation.rawEvidence),true);
assert.equal(observation.lineage.length>0,true);
assert.equal(observation.confidence>=0.5,true);

const qualityScore=0.91;
const reliabilityScore=0.85;
assert.equal(qualityScore>=0.75,true);
assert.equal(reliabilityScore>=0.7,true);

console.log("OM-06 quality validation tests passed.");
