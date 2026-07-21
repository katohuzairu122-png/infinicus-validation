(function(global){
  "use strict";

  function validate({
    auditPackage,
    policy
  }={}){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Audit policy is inactive.");
    }

    if(!auditPackage.monitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }

    if(
      policy.requireCorrelationId &&
      !auditPackage.correlationId
    ){
      issues.push("Correlation ID is required.");
    }

    if(
      policy.requireLineage &&
      (!Array.isArray(auditPackage.lineage) ||
       !auditPackage.lineage.length)
    ){
      issues.push("Audit lineage is required.");
    }

    const requiredSections=[
      "comparisons",
      "confidenceRatings",
      "reliabilityRatings",
      "benefitAssessments",
      "adverseOutcomes",
      "monitoringExceptions"
    ];

    const presentCount=
      requiredSections.filter(
        section=>Array.isArray(auditPackage[section])
      ).length;

    const completeness=
      presentCount/requiredSections.length;

    if(completeness<policy.minimumCompleteness){
      issues.push("Audit package completeness is below policy minimum.");
    }

    return {
      valid:issues.length===0,
      issues,
      completeness:Number(completeness.toFixed(4))
    };
  }

  global.INFINICUS.OM.outcomeAuditValidator=
    Object.freeze({validate});
})(window);
