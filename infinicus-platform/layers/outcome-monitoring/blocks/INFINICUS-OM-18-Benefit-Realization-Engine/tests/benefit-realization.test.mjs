import assert from "node:assert/strict";

const expected=1000;
const actual=800;
const cost=400;

const realizationRatio=actual/expected;
const netBenefit=actual-cost;
const benefitCostRatio=actual/cost;

assert.equal(realizationRatio,0.8);
assert.equal(netBenefit,400);
assert.equal(benefitCostRatio,2);

const statuses=[
  "realized",
  "partially_realized",
  "unrealized",
  "inconclusive"
];

assert.equal(statuses.includes("partially_realized"),true);

console.log("OM-18 benefit realization tests passed.");
