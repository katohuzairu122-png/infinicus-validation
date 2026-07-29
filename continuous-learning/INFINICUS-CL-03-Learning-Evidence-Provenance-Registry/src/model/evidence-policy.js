(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.CL.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "CL_EVIDENCE_POLICY_INVALID",
        "Evidence policy name and code are required."
      );
    }

    return runtime.success({
      learningEvidencePolicyId:
        input.learningEvidencePolicyId ||
        runtime.createId("cl_evidence_policy"),
      name:String(input.name),
      code:String(input.code),
      requireSourceReference:
        input.requireSourceReference !== false,
      requireLineage:
        input.requireLineage !== false,
      requireCorrelationId:
        input.requireCorrelationId !== false,
      allowDerivedEvidence:
        input.allowDerivedEvidence !== false,
      acceptedEvidenceTypes:
        runtime.clone(
          input.acceptedEvidenceTypes || [
            "observed",
            "calculated",
            "contextual",
            "documentary",
            "expert_review",
            "hypothesis"
          ]
        ),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.CL.learningEvidencePolicyModel=
    Object.freeze({create});
})(window);
