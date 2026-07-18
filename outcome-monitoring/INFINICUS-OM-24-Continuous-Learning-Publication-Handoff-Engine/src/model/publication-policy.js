(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_PUBLICATION_POLICY_INVALID",
        "Publication policy name and code are required."
      );
    }

    return runtime.success({
      learningPublicationPolicyId:
        input.learningPublicationPolicyId ||
        runtime.createId("om_learning_publication_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.5))),
      requireApplicabilityScope:
        input.requireApplicabilityScope !== false,
      requireLimitations:
        input.requireLimitations !== false,
      allowHypotheses:
        input.allowHypotheses !== false,
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.learningPublicationPolicyModel=
    Object.freeze({create});
})(window);
