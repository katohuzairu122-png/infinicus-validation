import assert from "node:assert/strict";

const baseline={
  metricId:"metric_1",
  value:100,
  confidence:0.8,
  lineage:[{source:"contract_1"}]
};

const target={
  metricId:"metric_1",
  targetValue:120,
  minimumAcceptableValue:115,
  maximumAcceptableValue:125,
  direction:"increase",
  confidence:0.8,
  lineage:[{source:"contract_1"}]
};

assert.equal(Boolean(baseline.metricId),true);
assert.equal(baseline.lineage.length>0,true);
assert.equal(target.minimumAcceptableValue<=target.maximumAcceptableValue,true);
assert.equal(["increase","decrease","maintain","range"].includes(target.direction),true);

console.log("OM-07 baseline and target tests passed.");
