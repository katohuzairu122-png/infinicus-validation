import assert from "node:assert/strict";

function compare(actual,operator,expected,tolerance=0){
  if(operator==="gte") return actual>=expected;
  if(operator==="lte") return actual<=expected;
  if(operator==="equals") return actual===expected;
  if(operator==="within_tolerance"){
    return Math.abs(actual-expected)<=tolerance;
  }
  return false;
}

assert.equal(compare(500,"gte",400),true);
assert.equal(compare(300,"gte",400),false);
assert.equal(compare(98,"within_tolerance",100,3),true);
assert.equal(compare(95,"within_tolerance",100,3),false);

console.log("ABA-11 revalidation tests passed.");
