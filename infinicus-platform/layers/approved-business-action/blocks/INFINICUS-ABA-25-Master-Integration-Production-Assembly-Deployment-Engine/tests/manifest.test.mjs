import assert from "node:assert/strict";

const ids=Array.from(
  {length:24},
  (_,index)=>`ABA-${String(index+1).padStart(2,"0")}`
);

assert.equal(ids[0],"ABA-01");
assert.equal(ids.at(-1),"ABA-24");
assert.equal(new Set(ids).size,24);

for(let index=0;index<ids.length;index+=1){
  assert.equal(
    ids[index],
    `ABA-${String(index+1).padStart(2,"0")}`
  );
}

console.log("ABA-25 manifest tests passed.");
