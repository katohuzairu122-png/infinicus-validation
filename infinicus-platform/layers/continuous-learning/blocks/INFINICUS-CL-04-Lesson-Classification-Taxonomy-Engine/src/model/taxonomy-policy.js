(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.CL.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "CL_TAXONOMY_POLICY_INVALID",
        "Taxonomy policy name and code are required."
      );
    }

    return runtime.success({
      learningTaxonomyPolicyId:
        input.learningTaxonomyPolicyId ||
        runtime.createId("cl_taxonomy_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumClassificationConfidence:
        Math.max(
          0,
          Math.min(
            1,
            Number(input.minimumClassificationConfidence ?? 0.5)
          )
        ),
      allowMultiLabel:
        input.allowMultiLabel !== false,
      maximumLabels:
        Math.max(1,Number(input.maximumLabels || 3)),
      requirePrimaryCategory:
        input.requirePrimaryCategory !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.CL.learningTaxonomyPolicyModel=
    Object.freeze({create});
})(window);
