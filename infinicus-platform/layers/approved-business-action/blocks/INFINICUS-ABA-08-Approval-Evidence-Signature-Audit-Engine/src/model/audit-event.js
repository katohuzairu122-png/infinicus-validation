(function(global){
  "use strict";
  function create({eventType,subjectId,payload,correlationId}){
    const runtime=global.INFINICUS.ABA.runtime;
    return runtime.success({
      approvalAuditEventId:runtime.createId("aba_approval_audit"),
      eventType:String(eventType),
      subjectId:String(subjectId),
      payload:runtime.clone(payload||{}),
      correlationId:correlationId||null,
      occurredAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalAuditEventModel=Object.freeze({create});
})(window);
