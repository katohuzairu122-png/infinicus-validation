(function(global){
  "use strict";
  function create({handoff,request,resource}){
    const runtime=global.INFINICUS.ABA.runtime;
    const startsAt=request.startsAt || new Date().toISOString();
    const expiresAt=request.expiresAt ||
      new Date(Date.now()+Number(request.holdMinutes || 60)*60000).toISOString();

    return runtime.success({
      resourceReservationId:runtime.createId("aba_resource_reservation"),
      resourceReservationHandoffId:handoff.resourceReservationHandoffId,
      executionPlanId:handoff.executionPlanId,
      executionTaskId:request.executionTaskId || null,
      taskAssignmentId:request.taskAssignmentId || null,
      resourceId:resource.resourceId,
      resourceType:resource.resourceType,
      quantity:Number(request.quantity || 0),
      unit:resource.unit,
      startsAt,
      expiresAt,
      state:"reserved",
      correlationId:handoff.correlationId || null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.resourceReservationModel=Object.freeze({create});
})(window);
