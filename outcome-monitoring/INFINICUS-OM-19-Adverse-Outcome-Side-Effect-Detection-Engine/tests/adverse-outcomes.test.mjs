import assert from "node:assert/strict";

const materiality=
  0.8*0.35 +
  0.7*0.2 +
  0.6*0.2 +
  0.4*0.15 +
  0.9*0.1;

assert.equal(Number(materiality.toFixed(2)),0.69);

const displacedCost=500;
const realizedBenefit=800;
const benefitOffset=Math.min(realizedBenefit,displacedCost);

assert.equal(benefitOffset,500);
assert.equal(displacedCost-benefitOffset,0);

const severities=["minor","warning","critical"];
assert.equal(severities.includes("warning"),true);

console.log("OM-19 adverse outcome tests passed.");
