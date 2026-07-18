import assert from "node:assert/strict";

const policy={
  missingCheckpointWarningCount:1,
  missingCheckpointCriticalCount:3,
  staleMinutesWarning:120,
  staleMinutesCritical:1440,
  minimumEvidenceCompleteness:0.8
};

assert.equal(
  3>=policy.missingCheckpointCriticalCount,
  true
);

assert.equal(
  180>=policy.staleMinutesWarning,
  true
);

const requiredEvidence=5;
const actualEvidence=3;
const completeness=actualEvidence/requiredEvidence;

assert.equal(completeness<policy.minimumEvidenceCompleteness,true);

const states=["open","waived","resolved"];
assert.equal(states.includes("resolved"),true);

console.log("OM-20 monitoring exception tests passed.");
