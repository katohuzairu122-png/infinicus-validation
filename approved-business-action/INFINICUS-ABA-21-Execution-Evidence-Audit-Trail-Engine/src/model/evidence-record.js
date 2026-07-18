(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.evidenceType || !input.subjectId){
      return runtime.failure(
        "ABA_EXECUTION_EVIDENCE_INVALID",
        "evidenceType and subjectId are required."
      );
    }

    return runtime.success({
      executionEvidenceId:
        input.executionEvidenceId ||
        runtime.createId("aba_execution_evidence"),
      evidenceType:
        String(input.evidenceType),
      subjectId:
        String(input.subjectId),
      actionInstanceId:
        input.actionInstanceId || null,
      executionPlanId:
        input.executionPlanId || null,
      executionScheduleId:
        input.executionScheduleId || null,
      executionTaskId:
        input.executionTaskId || null,
      payload:
        runtime.clone(input.payload || {}),
      sourceSystem:
        String(input.sourceSystem || "INFINICUS_ABA"),
      sourceReference:
        input.sourceReference || null,
      correlationId:
        input.correlationId || null,
      status:
        String(input.status || "recorded"),
      createdAt:
        input.createdAt || new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionEvidenceModel=
    Object.freeze({create});
})(window);
