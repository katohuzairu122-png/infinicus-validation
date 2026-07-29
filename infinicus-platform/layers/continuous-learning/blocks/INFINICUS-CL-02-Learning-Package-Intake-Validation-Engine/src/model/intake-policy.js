(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.CL.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "CL_INTAKE_POLICY_INVALID",
        "Intake policy name and code are required."
      );
    }

    return runtime.success({
      learningIntakePolicyId:
        input.learningIntakePolicyId ||
        runtime.createId("cl_intake_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.5))),
      requirePublicationReceipt:
        input.requirePublicationReceipt !== false,
      requireApplicabilityScope:
        input.requireApplicabilityScope !== false,
      requireLimitations:
        input.requireLimitations !== false,
      requireCorrelationId:
        input.requireCorrelationId !== false,
      requireLineage:
        input.requireLineage !== false,
      acceptedPackageVersions:
        runtime.clone(input.acceptedPackageVersions || ["1.0.0"]),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.CL.learningIntakePolicyModel=
    Object.freeze({create});
})(window);
