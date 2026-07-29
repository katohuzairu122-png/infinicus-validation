import assert from "node:assert/strict";

function evaluate(actual,operator,expected){
  if(operator==="equals") return actual===expected;
  if(operator==="gte") return actual>=expected;
  if(operator==="exists") return actual!==undefined && actual!==null;
  return false;
}

assert.equal(evaluate("completed","equals","completed"),true);
assert.equal(evaluate(5,"gte",3),true);
assert.equal(evaluate(null,"exists",null),false);

const states=[
  "verified",
  "partially_completed",
  "failed",
  "rolled_back",
  "unverifiable"
];

assert.equal(states.includes("verified"),true);

console.log("ABA-22 completion tests passed.");
