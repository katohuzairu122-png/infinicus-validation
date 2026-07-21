import assert from "node:assert/strict";

function success(data=null){
  return {ok:true,data,error:null};
}

function failure(code,message){
  return {
    ok:false,
    data:null,
    error:{code,message}
  };
}

assert.equal(success({value:1}).ok,true);
assert.equal(failure("ERR","Failed").ok,false);

const states=[
  "draft",
  "pending_validation",
  "validated",
  "scheduled",
  "collecting",
  "partially_observed",
  "observed",
  "evaluating",
  "alerted",
  "completed",
  "inconclusive",
  "failed",
  "paused",
  "cancelled",
  "expired"
];

assert.equal(states.includes("collecting"),true);
assert.equal(states.includes("completed"),true);
assert.equal(new Set(states).size,states.length);

const registry=new Map();
registry.set("metric_1",{metricId:"metric_1"});
assert.equal(registry.get("metric_1").metricId,"metric_1");

console.log("OM-01 runtime tests passed.");
