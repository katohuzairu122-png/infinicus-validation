(function(global){
  "use strict";

  function classify(failure,policy){
    const code=
      failure.code ||
      failure.errorCode ||
      "UNKNOWN_FAILURE";

    if(
      policy.requireManualInterventionFor.includes(code)
    ){
      return {
        category:"manual_intervention",
        retryable:false,
        rollbackRequired:false,
        compensationRequired:false
      };
    }

    if(
      policy.retryableFailureCodes.includes(code)
    ){
      return {
        category:"retryable",
        retryable:true,
        rollbackRequired:false,
        compensationRequired:false
      };
    }

    if(failure.irreversible===true){
      return {
        category:"irreversible",
        retryable:false,
        rollbackRequired:false,
        compensationRequired:
          policy.compensateIrreversibleActions
      };
    }

    return {
      category:"rollback_required",
      retryable:false,
      rollbackRequired:
        policy.rollbackOnFailure,
      compensationRequired:false
    };
  }

  global.INFINICUS.ABA.executionFailureClassifier=
    Object.freeze({classify});
})(window);
