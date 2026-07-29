(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_FAILURE_POLICY_INVALID",
        "Failure policy name and code are required."
      );
    }

    return runtime.success({
      executionFailurePolicyId:
        input.executionFailurePolicyId ||
        runtime.createId("aba_execution_failure_policy"),
      name:String(input.name),
      code:String(input.code),
      retryableFailureCodes:
        runtime.clone(input.retryableFailureCodes || []),
      maximumRetryAttempts:
        Math.max(0,Number(input.maximumRetryAttempts || 3)),
      rollbackOnFailure:
        input.rollbackOnFailure !== false,
      compensateIrreversibleActions:
        input.compensateIrreversibleActions !== false,
      requireManualInterventionFor:
        runtime.clone(input.requireManualInterventionFor || []),
      stopOnRollbackFailure:
        input.stopOnRollbackFailure !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionFailurePolicyModel=
    Object.freeze({create});
})(window);
