import assert from "node:assert/strict";

function required(value) {
  return value !== null &&
    value !== undefined &&
    value !== "";
}

function range(value, min, max) {
  return value == null ||
    (value >= min && value <= max);
}

function score(
  total,
  accepted,
  warnings,
  errors
) {
  if (!total) return 100;

  return Math.max(
    0,
    accepted / total * 100 -
    Math.min(10, warnings * 0.5) -
    Math.min(50, errors * 2)
  );
}

assert.equal(required("value"), true);
assert.equal(required(""), false);
assert.equal(range(50, 0, 100), true);
assert.equal(range(150, 0, 100), false);
assert.equal(score(100, 95, 2, 1), 92);

console.log("BI-04 data quality tests passed.");
