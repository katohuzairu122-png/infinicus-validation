(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    return runtime.success({
      executionAuditEventId:
        runtime.createId("aba_execution_audit"),
      eventType:
        String(input.eventType || "execution_evidence.recorded"),
      subjectId:
        String(input.subjectId || "unknown"),
      actorId:
        input.actorId || "system",
      payload:
        runtime.clone(input.payload || {}),
      correlationId:
        input.correlationId || null,
      occurredAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionAuditEventModel=
    Object.freeze({create});
})(window);
