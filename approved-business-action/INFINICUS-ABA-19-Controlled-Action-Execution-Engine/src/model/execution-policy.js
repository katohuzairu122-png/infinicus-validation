(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_EXECUTION_POLICY_INVALID",
        "Execution policy name and code are required."
      );
    }

    return runtime.success({
      controlledExecutionPolicyId:
        input.controlledExecutionPolicyId ||
        runtime.createId("aba_controlled_execution_policy"),
      name:String(input.name),
      code:String(input.code),
      requireDryRun:input.requireDryRun !== false,
      requireIdempotencyKey:input.requireIdempotencyKey !== false,
      requireQueueLease:input.requireQueueLease !== false,
      maximumAttempts:Math.max(1,Number(input.maximumAttempts || 3)),
      timeoutSeconds:Math.max(1,Number(input.timeoutSeconds || 30)),
      stopOnFailure:input.stopOnFailure !== false,
      allowPartialCompletion:Boolean(input.allowPartialCompletion),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.controlledExecutionPolicyModel=
    Object.freeze({create});
})(window);
