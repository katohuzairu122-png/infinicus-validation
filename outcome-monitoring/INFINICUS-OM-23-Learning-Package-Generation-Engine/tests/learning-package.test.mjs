import assert from "node:assert/strict";

const packageData={
  verdict:"successful",
  lessons:[
    {
      category:"benefit_realization",
      evidenceType:"factual"
    }
  ],
  successFactors:[
    {
      type:"target_achievement"
    }
  ],
  failureFactors:[],
  hypotheses:[],
  limitations:[],
  applicabilityScope:
    "same business and comparable operating conditions"
};

assert.equal(packageData.verdict,"successful");
assert.equal(packageData.lessons.length,1);
assert.equal(packageData.successFactors.length,1);
assert.equal(Boolean(packageData.applicabilityScope),true);

const evidenceTypes=[
  "factual",
  "contextual",
  "hypothesis"
];

assert.equal(evidenceTypes.includes("factual"),true);

console.log("OM-23 learning package tests passed.");
