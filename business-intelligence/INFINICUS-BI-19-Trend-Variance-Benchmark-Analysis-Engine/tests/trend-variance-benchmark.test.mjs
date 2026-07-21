import assert from "node:assert/strict";

function trend(values) {
  const first = values[0];
  const last = values.at(-1);
  return {
    change: last - first,
    percent: first === 0 ? null : (last - first) / Math.abs(first) * 100
  };
}

function variance(actual, target) {
  return {
    absolute: actual - target,
    percent: target === 0 ? null : (actual - target) / Math.abs(target) * 100
  };
}

assert.deepEqual(
  trend([100, 110, 120]),
  { change: 20, percent: 20 }
);

assert.deepEqual(
  variance(90, 100),
  { absolute: -10, percent: -10 }
);

console.log("BI-19 trend variance benchmark tests passed.");
