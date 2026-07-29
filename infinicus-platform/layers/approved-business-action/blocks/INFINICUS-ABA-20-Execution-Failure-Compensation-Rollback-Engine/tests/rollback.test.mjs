import assert from "node:assert/strict";

const policy={
  retryableFailureCodes:["TIMEOUT","RATE_LIMIT"],
  requireManualInterventionFor:["LEGAL_BLOCK"]
};

function classify(code,irreversible=false){
  if(policy.requireManualInterventionFor.includes(code)){
    return "manual_intervention";
  }
  if(policy.retryableFailureCodes.includes(code)){
    return "retryable";
  }
  if(irreversible){
    return "irreversible";
  }
  return "rollback_required";
}

assert.equal(classify("TIMEOUT"),"retryable");
assert.equal(classify("LEGAL_BLOCK"),"manual_intervention");
assert.equal(classify("PAYMENT_POSTED",true),"irreversible");
assert.equal(classify("UNKNOWN"),"rollback_required");

console.log("ABA-20 rollback tests passed.");
