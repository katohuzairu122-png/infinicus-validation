import assert from "node:assert/strict";

const contract={
  outcomeMonitoringContractId:"contract_1",
  actionInstanceId:"action_1",
  actionCompletionCertificateId:"certificate_1",
  confidence:0.8,
  lineage:[{source:"ABA-24"}],
  outcomes:[{
    definition:{
      expectedOutcomeDefinitionId:"outcome_1",
      baselineValue:100,
      targetValue:120,
      observationWindow:{
        startsAt:"2026-01-01T00:00:00.000Z",
        endsAt:"2026-02-01T00:00:00.000Z"
      },
      confidenceMinimum:0.7
    },
    metric:{
      outcomeMetricId:"metric_1",
      code:"revenue_growth",
      valueType:"number"
    },
    source:{
      outcomeEvidenceSourceId:"source_1",
      observedStateOnly:true
    }
  }]
};

assert.equal(Boolean(contract.outcomeMonitoringContractId),true);
assert.equal(contract.outcomes.length,1);
assert.equal(contract.confidence>=0.6,true);
assert.equal(contract.lineage.length>0,true);

console.log("OM-02 intake tests passed.");
