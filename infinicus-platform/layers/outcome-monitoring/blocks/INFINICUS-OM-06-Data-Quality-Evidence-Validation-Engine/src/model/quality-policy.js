(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_QUALITY_POLICY_INVALID",
        "Quality policy name and code are required."
      );
    }

    return runtime.success({
      observationQualityPolicyId:
        input.observationQualityPolicyId ||
        runtime.createId("om_quality_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumQualityScore:
        Math.max(0,Math.min(1,Number(input.minimumQualityScore ?? 0.75))),
      minimumReliabilityScore:
        Math.max(0,Math.min(1,Number(input.minimumReliabilityScore ?? 0.7))),
      requireRawEvidence:input.requireRawEvidence !== false,
      requireObservedClassification:
        input.requireObservedClassification !== false,
      rejectFutureTimestamps:
        input.rejectFutureTimestamps !== false,
      rejectDuplicateEvidence:
        input.rejectDuplicateEvidence !== false,
      maximumClockSkewMinutes:
        Math.max(0,Number(input.maximumClockSkewMinutes || 5)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationQualityPolicyModel=
    Object.freeze({create});
})(window);
