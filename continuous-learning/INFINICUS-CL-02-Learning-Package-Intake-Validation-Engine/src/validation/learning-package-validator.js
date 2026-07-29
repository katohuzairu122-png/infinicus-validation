(function(global){
  "use strict";

  function validate({
    publication,
    policy
  }={}){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Intake policy is inactive.");
    }

    if(!publication.learningPublicationId){
      issues.push("Learning publication ID is required.");
    }

    if(!publication.outcomeLearningPackageId){
      issues.push("Outcome learning package ID is required.");
    }

    if(!publication.outcomeVerdictId){
      issues.push("Outcome verdict ID is required.");
    }

    if(!publication.monitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }

    if(
      policy.requirePublicationReceipt &&
      !publication.learningPublicationReceiptId
    ){
      issues.push("Learning publication receipt ID is required.");
    }

    if(
      !policy.acceptedPackageVersions.includes(
        String(publication.packageVersion || "")
      )
    ){
      issues.push("Learning package version is not accepted.");
    }

    if(
      Number(publication.confidence ?? 0) <
      policy.minimumConfidence
    ){
      issues.push("Learning confidence is below intake minimum.");
    }

    if(
      Number(publication.reliability ?? 0) <
      policy.minimumReliability
    ){
      issues.push("Learning reliability is below intake minimum.");
    }

    if(
      policy.requireApplicabilityScope &&
      !publication.applicabilityScope
    ){
      issues.push("Applicability scope is required.");
    }

    if(
      policy.requireLimitations &&
      !Array.isArray(publication.limitations)
    ){
      issues.push("Limitations are required.");
    }

    if(
      policy.requireCorrelationId &&
      !publication.correlationId
    ){
      issues.push("Correlation ID is required.");
    }

    if(
      policy.requireLineage &&
      (
        !Array.isArray(publication.lineage) ||
        !publication.lineage.length
      )
    ){
      issues.push("Lineage is required.");
    }

    if(!Array.isArray(publication.lessons)){
      issues.push("Lessons must be an array.");
    }

    if(!Array.isArray(publication.hypotheses)){
      issues.push("Hypotheses must be an array.");
    }

    if(!Array.isArray(publication.successFactors)){
      issues.push("Success factors must be an array.");
    }

    if(!Array.isArray(publication.failureFactors)){
      issues.push("Failure factors must be an array.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.CL.learningPackageValidator=
    Object.freeze({validate});
})(window);
