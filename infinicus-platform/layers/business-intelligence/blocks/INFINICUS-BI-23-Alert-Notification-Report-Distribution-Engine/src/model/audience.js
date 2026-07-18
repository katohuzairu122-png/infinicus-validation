(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name){
      return runtime.failure(
        "BI_AUDIENCE_INVALID",
        "Audience name is required."
      );
    }

    return runtime.success({
      audienceId:
        input.audienceId ||
        runtime.createId("bi_audience"),
      name:String(input.name),
      recipientReferences:runtime.clone(input.recipientReferences || []),
      roleCodes:runtime.clone(input.roleCodes || []),
      classificationMaximum:
        String(input.classificationMaximum || "internal"),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.audienceModel=Object.freeze({create});
})(window);
