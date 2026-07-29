(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.sourceType){
      return runtime.failure(
        "ABA_OUTCOME_SOURCE_INVALID",
        "Evidence source name and sourceType are required."
      );
    }

    return runtime.success({
      outcomeEvidenceSourceId:
        input.outcomeEvidenceSourceId ||
        runtime.createId("aba_outcome_evidence_source"),
      name:String(input.name),
      sourceType:String(input.sourceType),
      sourceReference:input.sourceReference || null,
      systemOfRecord:Boolean(input.systemOfRecord),
      observedStateOnly:input.observedStateOnly !== false,
      refreshCadenceMinutes:
        Math.max(1,Number(input.refreshCadenceMinutes || 60)),
      dataQualityMinimum:
        Math.max(0,Math.min(1,Number(input.dataQualityMinimum ?? 0.8))),
      credentialReference:input.credentialReference || null,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.outcomeEvidenceSourceModel=
    Object.freeze({create});
})(window);
