(function(global){
  "use strict";

  function evaluate({
    handoff,
    policy
  }={}){
    const reasons=[];

    if(policy.status!=="active"){
      return {
        valid:false,
        issues:["Verdict policy is inactive."]
      };
    }

    const unresolvedCriticalExceptions=
      (handoff.monitoringExceptions || []).filter(
        item=>
          item.severity==="critical" &&
          !["resolved","waived"].includes(item.state)
      ).length;

    const maximumAdverseMateriality=
      (handoff.adverseOutcomes || []).reduce(
        (max,item)=>
          Math.max(max,Number(item.materiality || 0)),
        0
      );

    const realizedBenefits=
      (handoff.benefitAssessments || []).filter(
        item=>item.status==="realized"
      ).length;

    const partialBenefits=
      (handoff.benefitAssessments || []).filter(
        item=>item.status==="partially_realized"
      ).length;

    const failedComparisons=
      (handoff.comparisons || []).filter(
        item=>item.outcomeStatus==="failed"
      ).length;

    const achievedComparisons=
      (handoff.comparisons || []).filter(
        item=>item.outcomeStatus==="achieved"
      ).length;

    const confidence=
      Number(handoff.confidence ?? 0);

    const reliability=
      Number(handoff.reliability ?? 0);

    const auditComplete=
      Number(handoff.auditCompleteness ?? 0) >=
      policy.minimumAuditCompleteness;

    const confidenceSufficient=
      confidence>=policy.minimumConfidence;

    const reliabilitySufficient=
      reliability>=policy.minimumReliability;

    const adverseAcceptable=
      maximumAdverseMateriality<=
      policy.adverseMaterialityLimit;

    const exceptionsAcceptable=
      unresolvedCriticalExceptions<=
      policy.unresolvedCriticalExceptionLimit;

    let verdict="inconclusive";
    let humanReviewRequired=false;

    if(!auditComplete){
      reasons.push("Audit completeness is below the required minimum.");
    }

    if(!confidenceSufficient){
      reasons.push("Outcome confidence is below the required minimum.");
    }

    if(!reliabilitySufficient){
      reasons.push("Outcome reliability is below the required minimum.");
    }

    if(!exceptionsAcceptable){
      reasons.push("Unresolved critical monitoring exceptions remain.");
    }

    if(!adverseAcceptable){
      reasons.push("Material adverse outcomes exceed the allowed limit.");
    }

    if(
      auditComplete &&
      confidenceSufficient &&
      reliabilitySufficient &&
      exceptionsAcceptable
    ){
      if(
        achievedComparisons>0 &&
        realizedBenefits>0 &&
        adverseAcceptable &&
        failedComparisons===0
      ){
        verdict="successful";
        reasons.push("Expected outcomes were achieved with realized benefits.");
      }else if(
        achievedComparisons>0 &&
        (realizedBenefits>0 || partialBenefits>0) &&
        adverseAcceptable
      ){
        verdict="partially_successful";
        reasons.push("Some expected outcomes or benefits were realized.");
      }else if(
        failedComparisons>0 &&
        realizedBenefits===0
      ){
        verdict="unsuccessful";
        reasons.push("Expected outcomes were not achieved.");
      }else{
        verdict="conditional";
        humanReviewRequired=
          policy.requireHumanReviewForConditional;
        reasons.push("Evidence supports a conditional outcome verdict.");
      }
    }

    if(
      !adverseAcceptable &&
      verdict==="successful"
    ){
      verdict="conditional";
      humanReviewRequired=true;
    }

    return {
      valid:true,
      verdict,
      humanReviewRequired,
      reasons,
      metrics:{
        unresolvedCriticalExceptions,
        maximumAdverseMateriality:
          Number(maximumAdverseMateriality.toFixed(4)),
        realizedBenefits,
        partialBenefits,
        achievedComparisons,
        failedComparisons,
        confidence,
        reliability,
        auditCompleteness:
          Number(handoff.auditCompleteness ?? 0)
      }
    };
  }

  global.INFINICUS.OM.outcomeVerdictEvaluator=
    Object.freeze({evaluate});
})(window);
