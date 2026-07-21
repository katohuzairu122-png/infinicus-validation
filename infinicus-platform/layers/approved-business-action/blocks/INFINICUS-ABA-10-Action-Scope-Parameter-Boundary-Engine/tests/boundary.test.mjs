import assert from "node:assert/strict";

function inRange(value,min,max){
  if(min!=null && value<min) return false;
  if(max!=null && value>max) return false;
  return true;
}

assert.equal(inRange(50,0,100),true);
assert.equal(inRange(150,0,100),false);

const allowed=["publish","notify"];
assert.equal(allowed.includes("publish"),true);
assert.equal(allowed.includes("delete"),false);

const start=Date.now();
const end=start+30*60000;
const duration=(end-start)/60000;

assert.equal(duration<=60,true);

console.log("ABA-10 boundary tests passed.");
