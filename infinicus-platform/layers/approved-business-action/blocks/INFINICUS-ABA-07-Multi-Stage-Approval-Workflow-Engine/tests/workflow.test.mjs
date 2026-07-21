import assert from "node:assert/strict";

function evaluate(tasks, requiredCount, unanimous=false){
  const approved=tasks.filter(x=>x==="approved").length;
  const rejected=tasks.filter(x=>x==="rejected").length;
  if(unanimous && rejected>0) return "rejected";
  if(unanimous && approved===tasks.length) return "approved";
  if(approved>=requiredCount) return "approved";
  if(rejected>tasks.length-requiredCount) return "rejected";
  return "pending";
}

assert.equal(evaluate(["approved","pending"],1),"approved");
assert.equal(evaluate(["approved","rejected"],2),"rejected");
assert.equal(evaluate(["approved","approved"],2,true),"approved");
assert.equal(evaluate(["approved","rejected"],2,true),"rejected");

console.log("ABA-07 workflow tests passed.");
