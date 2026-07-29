import assert from "node:assert/strict";

function overlap(aStart,aEnd,bStart,bEnd){
  return aStart <= bEnd && bStart <= aEnd;
}

assert.equal(
  overlap(1,5,4,8),
  true
);

assert.equal(
  overlap(1,3,4,8),
  false
);

const left={price:10,budget:100};
const right={price:12,budget:100};

const contradictions=Object.keys(left).filter(
  key =>
    Object.prototype.hasOwnProperty.call(right,key) &&
    JSON.stringify(left[key]) !== JSON.stringify(right[key])
);

assert.deepEqual(
  contradictions,
  ["price"]
);

console.log("ABA-12 collision tests passed.");
