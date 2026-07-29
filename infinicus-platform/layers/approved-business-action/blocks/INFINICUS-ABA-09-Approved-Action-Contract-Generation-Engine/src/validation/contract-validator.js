(function(global){
  "use strict";

  function validateEvidencePackage(pkg){
    const issues=[];

    if(!pkg){
      issues.push("Approval evidence package is required.");
      return {valid:false,issues};
    }

    if(pkg.status!=="verified"){
      issues.push("Approval evidence package is not verified.");
    }

    if(pkg.workflowOutcome==="rejected"){
      issues.push("Rejected workflow cannot generate an approved action contract.");
    }

    if(
      !Array.isArray(pkg.evidence) ||
      !pkg.evidence.length
    ){
      issues.push("Approval evidence records are required.");
    }

    if(pkg.revokedAt || pkg.status==="revoked"){
      issues.push("Approval evidence package has been revoked.");
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  function validateContract(contract,template){
    const issues=[];

    if(!contract.actionInstanceId){
      issues.push("Action instance ID is required.");
    }

    if(!contract.approvalEvidencePackageId){
      issues.push("Approval evidence package ID is required.");
    }

    if(!contract.target){
      issues.push("Action target is required.");
    }

    for(const section of template.requiredSections || []){
      if(
        !Object.prototype.hasOwnProperty.call(
          contract.sections,
          section
        )
      ){
        issues.push(`Required contract section is missing: ${section}`);
      }
    }

    if(
      contract.expiresAt &&
      new Date(contract.expiresAt).getTime() <=
      new Date(contract.issuedAt).getTime()
    ){
      issues.push("Contract expiry must be later than issue time.");
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.actionContractValidator =
    Object.freeze({
      validateEvidencePackage,
      validateContract
    });
})(window);
