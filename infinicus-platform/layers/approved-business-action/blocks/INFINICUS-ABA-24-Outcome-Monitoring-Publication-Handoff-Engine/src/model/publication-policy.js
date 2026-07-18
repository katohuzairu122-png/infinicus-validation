(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_PUBLICATION_POLICY_INVALID",
        "Publication policy name and code are required."
      );
    }

    return runtime.success({
      outcomePublicationPolicyId:
        input.outcomePublicationPolicyId ||
        runtime.createId("aba_outcome_publication_policy"),
      name:String(input.name),
      code:String(input.code),
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      retryBackoffSeconds:
        Math.max(1,Number(input.retryBackoffSeconds || 60)),
      requireAcknowledgement:
        input.requireAcknowledgement !== false,
      publishRevocations:
        input.publishRevocations !== false,
      deadLetterOnFailure:
        input.deadLetterOnFailure !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.outcomePublicationPolicyModel=
    Object.freeze({create});
})(window);
