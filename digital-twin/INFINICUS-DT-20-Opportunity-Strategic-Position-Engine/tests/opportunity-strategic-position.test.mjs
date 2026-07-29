import assert from "node:assert/strict";

const value = 90;
const readiness = 70;
const feasibility = 80;
const fit = 85;
const effort = 40;
const risk = 25;

const gross =
  value * 0.30 +
  readiness * 0.20 +
  feasibility * 0.20 +
  fit * 0.20 +
  (100 - effort) * 0.10;

const adjusted =
  gross *
  (1 - risk / 100);

assert.equal(
  Number(gross.toFixed(2)),
  80
);

assert.equal(
  Number(adjusted.toFixed(2)),
  60
);

assert.equal(
  adjusted < gross,
  true
);

console.log("DT-20 opportunity strategic position tests passed.");
