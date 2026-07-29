import assert from "node:assert/strict";

const scores={
  businessType:1,
  market:1,
  geography:0,
  scale:1,
  customerSegment:0.5,
  channel:1,
  operatingModel:1,
  timeHorizon:0.5
};

const values=Object.values(scores);
const similarity=
  values.reduce((sum,value)=>sum+value,0)/values.length;

assert.equal(Number(similarity.toFixed(4)),0.75);

const thresholds={
  broad:0.8,
  conditional:0.55,
  restricted:0.3
};

const classification=
  similarity>=thresholds.broad
    ? "broad"
    : similarity>=thresholds.conditional
      ? "conditional"
      : similarity>=thresholds.restricted
        ? "restricted"
        : "out_of_scope";

assert.equal(classification,"conditional");

console.log("CL-05 applicability tests passed.");
