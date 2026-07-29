import assert from "node:assert/strict";

function percentVariance(current,reference){
  return ((current-reference)/Math.abs(reference))*100;
}

assert.equal(percentVariance(120,100),20);
assert.equal(percentVariance(80,100),-20);

const target={
  minimumAcceptableValue:95,
  maximumAcceptableValue:105
};

assert.equal(90<target.minimumAcceptableValue,true);
assert.equal(110>target.maximumAcceptableValue,true);

const warningVariancePercent=10;
const criticalVariancePercent=25;

assert.equal(Math.abs(20)>=warningVariancePercent,true);
assert.equal(Math.abs(20)>=criticalVariancePercent,false);

console.log("OM-11 variance tests passed.");
