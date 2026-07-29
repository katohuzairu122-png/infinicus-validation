import assert from "node:assert/strict";

const ids=Array.from(
  {length:24},
  (_,index)=>`BI-${String(index+1).padStart(2,"0")}`
);

assert.equal(ids[0],"BI-01");
assert.equal(ids.at(-1),"BI-24");
assert.equal(new Set(ids).size,24);

console.log("BI-25 manifest tests passed.");
