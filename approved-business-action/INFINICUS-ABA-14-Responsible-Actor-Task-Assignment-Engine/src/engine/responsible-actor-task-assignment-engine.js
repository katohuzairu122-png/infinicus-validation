(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerActor(input={}){
    const built =
      global.INFINICUS.ABA.actorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.assignmentStore.put(
      "actors",
      built.data
    );
  }

  async function registerTeam(input={}){
    const built =
      global.INFINICUS.ABA.teamModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.assignmentStore.put(
      "teams",
      built.data
    );
  }

  async function registerAvailability(input={}){
    if(!input.actorId || !input.startsAt || !input.endsAt){
      return runtime.failure(
        "ABA_AVAILABILITY_INVALID",
        "actorId, startsAt, and endsAt are required."
      );
    }

    return global.INFINICUS.ABA.assignmentStore.put(
      "availability",
      {
        availabilityRecordId:
          input.availabilityRecordId ||
          runtime.createId("aba_availability"),
        actorId:
          input.actorId,
        availabilityType:
          String(input.availabilityType || "unavailable"),
        startsAt:
          input.startsAt,
        endsAt:
          input.endsAt,
        reason:
          input.reason || null,
        createdAt:
          new Date().toISOString()
      }
    );
  }

  async function registerSeparationRule(input={}){
    if(!input.taskCode || !Array.isArray(input.incompatibleTaskCodes)){
      return runtime.failure(
        "ABA_SEPARATION_RULE_INVALID",
        "taskCode and incompatibleTaskCodes are required."
      );
    }

    return global.INFINICUS.ABA.assignmentStore.put(
      "separation_rules",
      {
        separationRuleId:
          input.separationRuleId ||
          runtime.createId("aba_separation_rule"),
        taskCode:
          String(input.taskCode),
        incompatibleTaskCodes:
          runtime.clone(input.incompatibleTaskCodes),
        status:
          String(input.status || "active"),
        createdAt:
          new Date().toISOString()
      }
    );
  }

  async function assignTasks({
    taskAssignmentHandoffId,
    assignments=[],
    assignedBy="system"
  }={}){
    const handoff =
      await global.INFINICUS.ABA.actionDecompositionExecutionPlanEngine
        .getTaskAssignmentHandoff({
          taskAssignmentHandoffId
        });

    if(!handoff.ok) return handoff;

    const separationRules =
      await global.INFINICUS.ABA.assignmentStore.list(
        "separation_rules"
      );

    if(!separationRules.ok) return separationRules;

    const createdAssignments=[];

    for(const request of assignments){
      const task =
        handoff.data.tasks.find(item =>
          item.executionTaskId === request.executionTaskId
        );

      if(!task){
        return runtime.failure(
          "ABA_EXECUTION_TASK_NOT_FOUND",
          `Task not found in assignment handoff: ${request.executionTaskId}`
        );
      }

      const actor =
        await global.INFINICUS.ABA.assignmentStore.get(
          "actors",
          request.actorId
        );

      if(!actor.ok) return actor;

      const currentAssignments =
        await global.INFINICUS.ABA.assignmentStore.listByIndex(
          "assignments",
          "actorId",
          request.actorId
        );

      if(!currentAssignments.ok) return currentAssignments;

      const unavailable =
        (await global.INFINICUS.ABA.assignmentStore.list(
          "availability"
        )).data.filter(item =>
          item.actorId === request.actorId &&
          item.availabilityType === "unavailable"
        );

      const relatedAssignments =
        createdAssignments.map(item=>({
          actorId:item.actorId,
          taskCode:
            handoff.data.tasks.find(task =>
              task.executionTaskId === item.executionTaskId
            )?.code
        }));

      const validation =
        global.INFINICUS.ABA.assignmentValidator.validate({
          actor:actor.data,
          task,
          currentAssignments:currentAssignments.data,
          unavailablePeriods:unavailable,
          separationRules:
            separationRules.data.filter(item =>
              item.status==="active"
            ),
          relatedAssignments
        });

      if(!validation.eligible){
        return runtime.failure(
          "ABA_TASK_ASSIGNMENT_INELIGIBLE",
          "Actor is not eligible for the task.",
          {
            executionTaskId:task.executionTaskId,
            actorId:actor.data.actorId,
            issues:validation.issues
          }
        );
      }

      const built =
        global.INFINICUS.ABA.taskAssignmentModel.create({
          executionTask:task,
          actor:actor.data,
          assignmentType:
            request.assignmentType || "primary",
          assignedBy
        });

      if(!built.ok) return built;

      await global.INFINICUS.ABA.assignmentStore.put(
        "assignments",
        built.data
      );

      createdAssignments.push(built.data);
    }

    const taskIds =
      new Set(handoff.data.tasks.map(task=>task.executionTaskId));

    const primaryTaskIds =
      new Set(
        createdAssignments
          .filter(item=>item.assignmentType==="primary")
          .map(item=>item.executionTaskId)
      );

    const missingPrimary =
      [...taskIds].filter(id=>!primaryTaskIds.has(id));

    if(missingPrimary.length){
      return runtime.failure(
        "ABA_PRIMARY_ASSIGNMENT_MISSING",
        "Every execution task requires a primary responsible actor.",
        {missingPrimary}
      );
    }

    await runtime.emit(
      "aba.task_assignments.created",
      {
        executionPlanId:
          handoff.data.executionPlanId,
        assignmentCount:
          createdAssignments.length
      }
    );

    return runtime.success({
      executionPlanId:
        handoff.data.executionPlanId,
      assignments:
        createdAssignments
    });
  }

  async function respond({
    taskAssignmentId,
    response,
    reason=null
  }={}){
    if(!["accepted","rejected"].includes(response)){
      return runtime.failure(
        "ABA_ASSIGNMENT_RESPONSE_INVALID",
        "Assignment response must be accepted or rejected."
      );
    }

    const assignment =
      await global.INFINICUS.ABA.assignmentStore.get(
        "assignments",
        taskAssignmentId
      );

    if(!assignment.ok) return assignment;

    if(
      ["accepted","rejected"].includes(assignment.data.state)
    ){
      return runtime.success({
        taskAssignment:assignment.data,
        idempotentReplay:true
      });
    }

    const updated={
      ...runtime.clone(assignment.data),
      state:response,
      acceptedAt:
        response==="accepted"
          ? new Date().toISOString()
          : null,
      rejectedAt:
        response==="rejected"
          ? new Date().toISOString()
          : null,
      rejectionReason:
        response==="rejected"
          ? reason || "Assignment rejected."
          : null,
      updatedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.assignmentStore.put(
      "assignments",
      updated
    );

    await runtime.emit(
      `aba.task_assignment.${response}`,
      updated
    );

    return runtime.success({
      taskAssignment:updated
    });
  }

  async function prepareReservationHandoff({
    executionPlanId
  }={}){
    const assignments =
      await global.INFINICUS.ABA.assignmentStore.listByIndex(
        "assignments",
        "executionPlanId",
        executionPlanId
      );

    if(!assignments.ok) return assignments;

    const primary =
      assignments.data.filter(item =>
        item.assignmentType==="primary"
      );

    if(
      !primary.length ||
      primary.some(item=>item.state!=="accepted")
    ){
      return runtime.failure(
        "ABA_ASSIGNMENTS_NOT_ACCEPTED",
        "All primary assignments must be accepted before resource reservation."
      );
    }

    const handoff={
      resourceReservationHandoffId:
        runtime.createId("aba_resource_reservation_handoff"),
      targetBlock:
        "ABA-15",
      executionPlanId,
      assignments:
        assignments.data.map(runtime.clone),
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.assignmentStore.put(
      "reservation_handoffs",
      handoff
    );

    await runtime.emit(
      "aba.task_assignments.ready_for_reservation",
      handoff
    );

    return runtime.success({
      resourceReservationHandoff:handoff
    });
  }

  const api = Object.freeze({
    registerActor,
    registerTeam,
    registerAvailability,
    registerSeparationRule,
    assignTasks,
    respond,
    prepareReservationHandoff,
    getTaskAssignment:({taskAssignmentId}) =>
      global.INFINICUS.ABA.assignmentStore.get(
        "assignments",
        taskAssignmentId
      ),
    getResourceReservationHandoff:({
      resourceReservationHandoffId
    }) =>
      global.INFINICUS.ABA.assignmentStore.get(
        "reservation_handoffs",
        resourceReservationHandoffId
      ),
    listPlanAssignments:({executionPlanId}) =>
      global.INFINICUS.ABA.assignmentStore.listByIndex(
        "assignments",
        "executionPlanId",
        executionPlanId
      )
  });

  runtime.registerService(
    "aba.responsible_actor_task_assignment",
    api,
    {block:"ABA-14"}
  );

  runtime.registerRoute(
    "aba.actor.register",
    registerActor
  );

  runtime.registerRoute(
    "aba.team.register",
    registerTeam
  );

  runtime.registerRoute(
    "aba.actor_availability.register",
    registerAvailability
  );

  runtime.registerRoute(
    "aba.separation_rule.register",
    registerSeparationRule
  );

  runtime.registerRoute(
    "aba.tasks.assign",
    assignTasks
  );

  runtime.registerRoute(
    "aba.task_assignment.respond",
    respond
  );

  runtime.registerRoute(
    "aba.task_assignments.prepare_reservation",
    prepareReservationHandoff
  );

  runtime.registerBlock("ABA-14",{
    name:"Responsible Actor and Task Assignment Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.responsibleActorTaskAssignmentEngine =
    api;
})(window);
