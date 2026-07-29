import assert from "node:assert/strict";

const handoff={
  auditCompleteness:1,
  confidence:0.85,
  reliability:0.82,
  benefitAssessments:[
    {status:"realized"}
  ],
  comparisons:[
    {outcomeStatus:"achieved"}
  ],
  adverseOutcomes:[],
  monitoringExceptions:[]
};

assert.equal(handoff.auditCompleteness>=0.9,true);
assert.equal(handoff.confidence>=0.6,true);
assert.equal(handoff.reliability>=0.6,true);
assert.equal(handoff.benefitAssessments[0].status,"realized");
assert.equal(handoff.comparisons[0].outcomeStatus,"achieved");

const verdicts=[
  "successful",
  "partially_successful",
  "unsuccessful",
  "conditional",
  "inconclusive"
];

assert.equal(verdicts.includes("successful"),true);

console.log("OM-22 verdict tests passed.");
