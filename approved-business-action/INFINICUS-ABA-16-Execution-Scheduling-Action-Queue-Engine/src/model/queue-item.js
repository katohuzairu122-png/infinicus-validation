(function(global){
  "use strict";
  function create({schedule,task,assignment,reservationIds,priority}){
    const runtime=global.INFINICUS.ABA.runtime;
    return runtime.success({
      actionQueueItemId:runtime.createId("aba_action_queue_item"),
      executionScheduleId:schedule.executionScheduleId,
      executionPlanId:schedule.executionPlanId,
      executionTaskId:task.executionTaskId,
      taskAssignmentId:assignment?.taskAssignmentId || null,
      assignedActorId:assignment?.actorId || null,
      reservationIds:runtime.clone(reservationIds || []),
      sequence:Number(task.sequence || 1),
      dependencies:runtime.clone(task.dependencies || []),
      priority:Number(priority ?? schedule.defaultPriority),
      scheduledStartAt:task.scheduledStartAt,
      scheduledEndAt:task.scheduledEndAt,
      state:"queued",
      attemptCount:0,
      leaseOwner:null,
      leaseExpiresAt:null,
      correlationId:schedule.correlationId,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.actionQueueItemModel=Object.freeze({create});
})(window);
