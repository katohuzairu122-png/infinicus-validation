(function(global){
  "use strict";

  function getByPath(object,path){
    return path
      .split(".")
      .reduce(
        (value,key) =>
          value == null ? undefined : value[key],
        object
      );
  }

  function evaluateCriterion(criterion,context){
    const actual=
      getByPath(context,criterion.path || "");

    const expected=
      criterion.expectedValue;

    let passed=false;

    if(criterion.operator==="exists"){
      passed=actual!==undefined && actual!==null;
    }else if(criterion.operator==="equals"){
      passed=actual===expected;
    }else if(criterion.operator==="gte"){
      passed=Number(actual)>=Number(expected);
    }else if(criterion.operator==="lte"){
      passed=Number(actual)<=Number(expected);
    }else if(criterion.operator==="includes"){
      passed=Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual || "").includes(String(expected));
    }

    return {
      criterionId:
        criterion.criterionId || null,
      name:
        criterion.name || criterion.path,
      passed,
      actual,
      expected,
      operator:
        criterion.operator
    };
  }

  function evaluate({
    evidencePackage,
    completionCriteria,
    verificationCriteria,
    policy,
    manualVerification
  }){
    const evidenceCount=
      evidencePackage.evidence?.length || 0;

    const completionResults=
      completionCriteria.map(item=>
        evaluateCriterion(item,evidencePackage)
      );

    const verificationResults=
      verificationCriteria.map(item=>
        evaluateCriterion(item,evidencePackage)
      );

    const evidenceSufficient=
      evidenceCount>=policy.minimumEvidenceCount;

    const completionPassed=
      policy.requireAllCompletionCriteria
        ? completionResults.every(item=>item.passed)
        : completionResults.some(item=>item.passed);

    const verificationPassed=
      policy.requireAllVerificationCriteria
        ? verificationResults.every(item=>item.passed)
        : verificationResults.some(item=>item.passed);

    const manualPassed=
      policy.allowManualVerification &&
      manualVerification?.approved===true;

    let state="unverifiable";

    if(
      evidencePackage.finalState==="rolled_back" ||
      evidencePackage.finalState==="rollback_failed"
    ){
      state="rolled_back";
    }else if(
      evidenceSufficient &&
      completionPassed &&
      (verificationPassed || manualPassed)
    ){
      state="verified";
    }else if(
      policy.allowPartialCompletion &&
      evidenceSufficient &&
      completionResults.some(item=>item.passed)
    ){
      state="partially_completed";
    }else if(
      evidencePackage.finalState==="failed"
    ){
      state="failed";
    }

    return {
      state,
      evidenceSufficient,
      completionResults,
      verificationResults,
      manualVerification:
        manualVerification || null
    };
  }

  global.INFINICUS.ABA.actionCompletionEvaluator=
    Object.freeze({
      getByPath,
      evaluateCriterion,
      evaluate
    });
})(window);
