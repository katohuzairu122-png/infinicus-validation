(function(global){
  "use strict";

  function create({
    executionTask,
    actor,
    assignmentType,
    assignedBy
  }){
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      taskAssignmentId:
        runtime.createId("aba_task_assignment"),
      executionPlanId:
        executionTask.executionPlanId,
      executionTaskId:
        executionTask.executionTaskId,
      actorId:
        actor.actorId,
      actorType:
        actor.actorType,
      assignmentType:
        String(assignmentType || "primary"),
      assignedBy:
        String(assignedBy || "system"),
      requiredCapabilities:
        runtime.clone(
          executionTask.requiredCapabilities || []
        ),
      state:
        "pending_acceptance",
      acceptedAt:
        null,
      rejectedAt:
        null,
      rejectionReason:
        null,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.taskAssignmentModel =
    Object.freeze({create});
})(window);
