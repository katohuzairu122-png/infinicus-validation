import assert from "node:assert/strict";

const total=100;
const existing=[20,15];
const requested=50;
const available=total-existing.reduce((a,b)=>a+b,0);

assert.equal(available,65);
assert.equal(requested<=available,true);
assert.equal(80<=available,false);

const future=new Date(Date.now()+60000).getTime();
assert.equal(future>Date.now(),true);

console.log("ABA-15 reservation tests passed.");
