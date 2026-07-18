import assert from "node:assert/strict";

const workItems = [
  { enteredAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T01:00:00Z", defect: false, rework: false, slaMet: true },
  { enteredAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T02:00:00Z", defect: true, rework: true, slaMet: false }
];

const minutes = workItems.map(item =>
  (new Date(item.completedAt) - new Date(item.enteredAt)) / 60000
);

assert.deepEqual(minutes, [60, 120]);
assert.equal(minutes.reduce((a,b)=>a+b,0)/minutes.length, 90);
assert.equal(workItems.filter(i=>i.defect).length / workItems.length * 100, 50);

console.log("DT-11 operations process tests passed.");
