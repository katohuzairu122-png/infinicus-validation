import assert from "node:assert/strict";

function increaseProgress(baseline,current,target){
  return (current-baseline)/(target-baseline);
}

function decreaseProgress(baseline,current,target){
  return (baseline-current)/(baseline-target);
}

assert.equal(increaseProgress(100,110,120),0.5);
assert.equal(increaseProgress(100,120,120),1);
assert.equal(decreaseProgress(100,90,80),0.5);
assert.equal(decreaseProgress(100,80,80),1);

const range={minimum:95,maximum:105,current:100};
assert.equal(
  range.current>=range.minimum &&
  range.current<=range.maximum,
  true
);

console.log("OM-10 progress tests passed.");
