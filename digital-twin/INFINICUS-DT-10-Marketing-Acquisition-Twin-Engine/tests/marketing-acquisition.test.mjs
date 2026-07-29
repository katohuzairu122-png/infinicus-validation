import assert from "node:assert/strict";

const spend = 100;
const revenue = 400;
const customers = 20;
const impressions = 1000;
const engagements = 100;

assert.equal(
  revenue / spend,
  4
);

assert.equal(
  spend / customers,
  5
);

assert.equal(
  Number((engagements / impressions * 100).toFixed(2)),
  10
);

assert.equal(
  Number(((revenue - spend) / spend * 100).toFixed(2)),
  300
);

console.log("DT-10 marketing acquisition tests passed.");
