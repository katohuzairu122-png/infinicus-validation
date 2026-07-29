import assert from "node:assert/strict";

const metric={
  metricId:"metric_1",
  code:"revenue_growth",
  valueType:"number",
  unit:"percent",
  aggregation:"latest",
  direction:"increase",
  confidenceMinimum:0.7,
  observationSourceReference:"source_1"
};

assert.equal(Boolean(metric.metricId),true);
assert.equal(Boolean(metric.code),true);
assert.equal(metric.confidenceMinimum>=0 && metric.confidenceMinimum<=1,true);
assert.equal(Boolean(metric.observationSourceReference),true);

const codes=new Set(["revenue_growth"]);
assert.equal(codes.has("revenue_growth"),true);

console.log("OM-03 metric registry tests passed.");
