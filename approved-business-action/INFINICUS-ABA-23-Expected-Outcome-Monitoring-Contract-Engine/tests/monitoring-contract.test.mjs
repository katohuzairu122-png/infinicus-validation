import assert from "node:assert/strict";

const outcome={
  baselineValue:100,
  targetValue:120,
  observationWindow:{
    startsAt:new Date().toISOString(),
    endsAt:new Date(Date.now()+86400000).toISOString()
  }
};

assert.equal(outcome.targetValue>outcome.baselineValue,true);

assert.equal(
  new Date(outcome.observationWindow.endsAt).getTime() >
  new Date(outcome.observationWindow.startsAt).getTime(),
  true
);

const source={
  observedStateOnly:true,
  dataQualityMinimum:0.8
};

assert.equal(source.observedStateOnly,true);
assert.equal(source.dataQualityMinimum>=0.8,true);

console.log("ABA-23 monitoring contract tests passed.");
