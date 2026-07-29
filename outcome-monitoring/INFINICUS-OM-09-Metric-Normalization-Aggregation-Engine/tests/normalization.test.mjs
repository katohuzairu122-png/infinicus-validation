import assert from "node:assert/strict";

const values=[10,20,30];

assert.equal(
  values.reduce((sum,value)=>sum+value,0),
  60
);

assert.equal(
  values.reduce((sum,value)=>sum+value,0)/values.length,
  20
);

assert.equal(Math.min(...values),10);
assert.equal(Math.max(...values),30);
assert.equal(values.at(-1),30);

const normalized=Number(Number("12.34567").toFixed(4));
assert.equal(normalized,12.3457);

console.log("OM-09 normalization tests passed.");
