(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_CONFIDENCE_POLICY_INVALID",
        "Confidence policy name and code are required."
      );
    }

    return runtime.success({
      outcomeConfidencePolicyId:
        input.outcomeConfidencePolicyId ||
        runtime.createId("om_confidence_policy"),
      name:String(input.name),
      code:String(input.code),
      weights:runtime.clone(input.weights || {
        comparisonConfidence:0.25,
        attributionConfidence:0.15,
        causationConfidence:0.2,
        sourceReliability:0.15,
        sampleSufficiency:0.1,
        temporalCoverage:0.1,
        evidenceCompleteness:0.05
      }),
      confounderPenaltyWeight:
        Math.max(0,Math.min(1,Number(input.confounderPenaltyWeight ?? 0.3))),
      missingEvidencePenalty:
        Math.max(0,Math.min(1,Number(input.missingEvidencePenalty ?? 0.1))),
      highThreshold:
        Math.max(0,Math.min(1,Number(input.highThreshold ?? 0.8))),
      mediumThreshold:
        Math.max(0,Math.min(1,Number(input.mediumThreshold ?? 0.6))),
      reliabilityHighThreshold:
        Math.max(0,Math.min(1,Number(input.reliabilityHighThreshold ?? 0.8))),
      reliabilityMediumThreshold:
        Math.max(0,Math.min(1,Number(input.reliabilityMediumThreshold ?? 0.6))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeConfidencePolicyModel=
    Object.freeze({create});
})(window);
