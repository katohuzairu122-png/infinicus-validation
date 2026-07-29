(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_COMPLETION_POLICY_INVALID",
        "Completion policy name and code are required."
      );
    }

    return runtime.success({
      actionCompletionPolicyId:
        input.actionCompletionPolicyId ||
        runtime.createId("aba_action_completion_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumEvidenceCount:
        Math.max(1,Number(input.minimumEvidenceCount || 1)),
      requireAllCompletionCriteria:
        input.requireAllCompletionCriteria !== false,
      requireAllVerificationCriteria:
        input.requireAllVerificationCriteria !== false,
      allowManualVerification:
        input.allowManualVerification !== false,
      allowPartialCompletion:
        Boolean(input.allowPartialCompletion),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionCompletionPolicyModel=
    Object.freeze({create});
})(window);
