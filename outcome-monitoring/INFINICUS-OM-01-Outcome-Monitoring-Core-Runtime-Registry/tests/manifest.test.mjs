import assert from "node:assert/strict";

const ids=Array.from(
  {length:25},
  (_,index)=>`OM-${String(index+1).padStart(2,"0")}`
);

assert.equal(ids.length,25);
assert.equal(ids[0],"OM-01");
assert.equal(ids.at(-1),"OM-25");
assert.equal(new Set(ids).size,25);

console.log("OM-01 manifest tests passed.");
