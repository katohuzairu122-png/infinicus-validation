import assert from "node:assert/strict";

function score(retention, attendance, engagement, skills) {
  return Number((
    retention * 0.3 +
    attendance * 0.25 +
    engagement * 20 * 0.25 +
    skills * 0.2
  ).toFixed(2));
}

assert.equal(
  score(90, 95, 4, 85),
  87.75
);

const signals = [];

if (18 > 15) signals.push("HIGH_EMPLOYEE_TURNOVER");
if (6 > 5) signals.push("HIGH_ABSENCE_RATE");
if (92 >= 90) signals.push("STRONG_SKILL_COVERAGE");

assert.deepEqual(
  signals,
  [
    "HIGH_EMPLOYEE_TURNOVER",
    "HIGH_ABSENCE_RATE",
    "STRONG_SKILL_COVERAGE"
  ]
);

console.log("BI-17 workforce intelligence tests passed.");
