(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_POLICY_INVALID",
        "Policy name and code are required."
      );
    }

    return runtime.success({
      twinPublicationPolicyId:
        input.twinPublicationPolicyId ||
        runtime.createId("bi_twin_publication_policy"),
      name:String(input.name),
      code:String(input.code),
      requireDataQualityMinimum:
        Math.max(0,Math.min(1,Number(input.requireDataQualityMinimum ?? 0.7))),
      requireConfidenceMinimum:
        Math.max(0,Math.min(1,Number(input.requireConfidenceMinimum ?? 0.6))),
      requireLineage:input.requireLineage !== false,
      maximumAttempts:Math.max(1,Number(input.maximumAttempts || 3)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.twinPublicationPolicyModel=
    Object.freeze({create});
})(window);
