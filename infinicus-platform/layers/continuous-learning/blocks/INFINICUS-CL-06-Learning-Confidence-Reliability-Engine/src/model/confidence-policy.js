(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.CL.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "CL_CONFIDENCE_POLICY_INVALID",
        "Learning confidence policy name and code are required."
      );
    }

    return runtime.success({
      learningConfidencePolicyId:
        input.learningConfidencePolicyId ||
        runtime.createId("cl_learning_confidence_policy"),
      name:String(input.name),
      code:String(input.code),
      weights:runtime.clone(input.weights || {
        evidenceConfidence:0.25,
        evidenceReliability:0.2,
        classificationConfidence:0.15,
        applicabilityConfidence:0.2,
        provenanceCompleteness:0.1,
        lineageCompleteness:0.1
      }),
      limitationPenalty:
        Math.max(0,Math.min(1,Number(input.limitationPenalty ?? 0.05))),
      restrictionPenalty:
        Math.max(0,Math.min(1,Number(input.restrictionPenalty ?? 0.15))),
      unclassifiedPenalty:
        Math.max(0,Math.min(1,Number(input.unclassifiedPenalty ?? 0.25))),
      eligibleThreshold:
        Math.max(0,Math.min(1,Number(input.eligibleThreshold ?? 0.75))),
      reviewThreshold:
        Math.max(0,Math.min(1,Number(input.reviewThreshold ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.CL.learningConfidencePolicyModel=
    Object.freeze({create});
})(window);
