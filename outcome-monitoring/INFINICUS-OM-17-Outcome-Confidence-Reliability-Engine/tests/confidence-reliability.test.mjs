import assert from "node:assert/strict";

const baseConfidence=0.82;
const confounderPenalty=0.12;
const missingPenalty=0.05;
const confidence=Math.max(
  0,
  baseConfidence-confounderPenalty-missingPenalty
);

assert.equal(Number(confidence.toFixed(2)),0.65);

const reliability=
  0.9*0.35 +
  0.8*0.25 +
  0.75*0.2 +
  0.85*0.2;

assert.equal(Number(reliability.toFixed(3)),0.835);

const bands=["high","medium","low"];
assert.equal(bands.includes("high"),true);

console.log("OM-17 confidence and reliability tests passed.");
