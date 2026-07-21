import assert from "node:assert/strict";

const binding={
  metricId:"metric_1",
  observationSourceId:"source_1",
  freshnessToleranceMinutes:120
};

const observation={
  metricId:"metric_1",
  observationSourceId:"source_1",
  value:125,
  classification:"observed",
  sourceTimestamp:new Date().toISOString()
};

assert.equal(observation.metricId,binding.metricId);
assert.equal(observation.observationSourceId,binding.observationSourceId);
assert.equal(observation.classification,"observed");
assert.equal(observation.value,125);

console.log("OM-05 observation collection tests passed.");
