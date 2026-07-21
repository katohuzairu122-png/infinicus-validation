(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_COLLECTION_POLICY_INVALID",
        "Collection policy name and code are required."
      );
    }

    return runtime.success({
      observationCollectionPolicyId:
        input.observationCollectionPolicyId ||
        runtime.createId("om_collection_policy"),
      name:String(input.name),
      code:String(input.code),
      requireObservedClassification:
        input.requireObservedClassification !== false,
      rejectStaleObservations:
        input.rejectStaleObservations !== false,
      requireSourceTimestamp:
        input.requireSourceTimestamp !== false,
      preserveRawEvidence:
        input.preserveRawEvidence !== false,
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationCollectionPolicyModel=
    Object.freeze({create});
})(window);
