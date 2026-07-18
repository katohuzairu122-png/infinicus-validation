(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.executionSchedulePolicyModel.create(input);
    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionScheduleStore.put(
      "policies",
      built.data
    );
  }

  async function createSchedule({
    executionScheduleHandoffId,
    executionSchedulePolicyId,
    tasks=[],
    approvedWindow={}
  }={}){
    const handoff=
      await global.INFINICUS.ABA.resourceReservationAvailabilityEngine
        .getExecutionScheduleHandoff({executionScheduleHandoffId});
    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.ABA.executionScheduleStore.get(
        "policies",
        executionSchedulePolicyId
      );
    if(!policy.ok) return policy;

    const ordering=
      global.INFINICUS.ABA.executionScheduleValidator.topologicalSort(tasks);

    if(!ordering.valid){
      return runtime.failure(
        "ABA_EXECUTION_SCHEDULE_INVALID",
        "Task dependency graph is invalid."
      );
    }

    const reservationExpiry=
      handoff.data.reservations
        .map(item=>item.expiresAt)
        .filter(Boolean)
        .sort()[0] || null;

    let cursor=
      approvedWindow.startsAt
        ? new Date(approvedWindow.startsAt).getTime()
        : Date.now();

    const scheduledTasks=[];

    for(const task of ordering.ordered){
      const startsAt=new Date(cursor).toISOString();
      const endsAt=new Date(
        cursor + Number(task.durationMinutes || 60)*60000
      ).toISOString();

      const validity=
        global.INFINICUS.ABA.executionScheduleValidator.validateWindow(
          startsAt,
          endsAt,
          approvedWindow,
          reservationExpiry
        );

      if(!validity.valid){
        return runtime.failure(
          "ABA_EXECUTION_WINDOW_INVALID",
          "Task cannot be scheduled inside approved boundaries.",
          {
            executionTaskId:task.executionTaskId,
            issues:validity.issues
          }
        );
      }

      scheduledTasks.push({
        ...runtime.clone(task),
        scheduledStartAt:startsAt,
        scheduledEndAt:endsAt
      });

      cursor=new Date(endsAt).getTime();
    }

    const schedule={
      executionScheduleId:runtime.createId("aba_execution_schedule"),
      executionScheduleHandoffId,
      executionPlanId:handoff.data.executionPlanId,
      executionSchedulePolicyId,
      approvedWindow:runtime.clone(approvedWindow),
      reservationExpiry,
      defaultPriority:policy.data.defaultPriority,
      retryLimit:policy.data.retryLimit,
      retryBackoffSeconds:policy.data.retryBackoffSeconds,
      leaseSeconds:policy.data.leaseSeconds,
      state:"active",
      correlationId:handoff.data.correlationId || null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "schedules",
      schedule
    );

    const queueItems=[];

    for(const task of scheduledTasks){
      const assignment=handoff.data.assignments.find(item =>
        item.executionTaskId===task.executionTaskId &&
        item.assignmentType==="primary"
      );

      const reservationIds=handoff.data.reservations
        .filter(item =>
          !item.executionTaskId ||
          item.executionTaskId===task.executionTaskId
        )
        .map(item=>item.resourceReservationId);

      const built=
        global.INFINICUS.ABA.actionQueueItemModel.create({
          schedule,
          task,
          assignment,
          reservationIds
        });

      if(!built.ok) return built;

      await global.INFINICUS.ABA.executionScheduleStore.put(
        "queue",
        built.data
      );

      queueItems.push(built.data);
    }

    const adapterHandoff={
      executionAdapterHandoffId:
        runtime.createId("aba_execution_adapter_handoff"),
      targetBlock:"ABA-17",
      executionScheduleId:schedule.executionScheduleId,
      executionPlanId:schedule.executionPlanId,
      queueItems:queueItems.map(runtime.clone),
      assignments:handoff.data.assignments.map(runtime.clone),
      reservations:handoff.data.reservations.map(runtime.clone),
      retryPolicy:{
        retryLimit:schedule.retryLimit,
        retryBackoffSeconds:schedule.retryBackoffSeconds
      },
      leaseSeconds:schedule.leaseSeconds,
      correlationId:schedule.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "adapter_handoffs",
      adapterHandoff
    );

    await runtime.emit("aba.execution_schedule.created",{
      executionSchedule:schedule,
      queueItemCount:queueItems.length,
      executionAdapterHandoffId:
        adapterHandoff.executionAdapterHandoffId
    });

    return runtime.success({
      executionSchedule:schedule,
      queueItems,
      executionAdapterHandoff:adapterHandoff
    });
  }

  async function updateScheduleState({
    executionScheduleId,
    state,
    reason
  }={}){
    const allowed=["paused","active","cancelled"];
    if(!allowed.includes(state)){
      return runtime.failure(
        "ABA_SCHEDULE_STATE_INVALID",
        "Schedule state must be paused, active, or cancelled."
      );
    }

    const schedule=
      await global.INFINICUS.ABA.executionScheduleStore.get(
        "schedules",
        executionScheduleId
      );
    if(!schedule.ok) return schedule;

    const updated={
      ...runtime.clone(schedule.data),
      state,
      stateReason:reason || null,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "schedules",
      updated
    );

    await runtime.emit(`aba.execution_schedule.${state}`,updated);

    return runtime.success({executionSchedule:updated});
  }

  async function leaseNext({
    workerId,
    now=new Date().toISOString()
  }={}){
    const queued=
      await global.INFINICUS.ABA.executionScheduleStore.listByIndex(
        "queue",
        "state",
        "queued"
      );

    if(!queued.ok) return queued;

    const eligible=queued.data
      .filter(item =>
        new Date(item.scheduledStartAt).getTime() <=
        new Date(now).getTime()
      )
      .sort((a,b) =>
        b.priority-a.priority ||
        new Date(a.scheduledStartAt)-new Date(b.scheduledStartAt)
      )[0];

    if(!eligible){
      return runtime.failure(
        "ABA_QUEUE_EMPTY",
        "No execution queue item is currently due."
      );
    }

    const schedule=
      await global.INFINICUS.ABA.executionScheduleStore.get(
        "schedules",
        eligible.executionScheduleId
      );
    if(!schedule.ok) return schedule;

    if(schedule.data.state!=="active"){
      return runtime.failure(
        "ABA_SCHEDULE_NOT_ACTIVE",
        "Execution schedule is not active."
      );
    }

    const leased={
      ...runtime.clone(eligible),
      state:"leased",
      leaseOwner:String(workerId || "worker"),
      leaseExpiresAt:new Date(
        Date.now()+Number(schedule.data.leaseSeconds || 300)*1000
      ).toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "queue",
      leased
    );

    return runtime.success({queueItem:leased});
  }

  const api=Object.freeze({
    registerPolicy,
    createSchedule,
    updateScheduleState,
    leaseNext,
    getExecutionSchedule:({executionScheduleId}) =>
      global.INFINICUS.ABA.executionScheduleStore.get(
        "schedules",
        executionScheduleId
      ),
    getExecutionAdapterHandoff:({executionAdapterHandoffId}) =>
      global.INFINICUS.ABA.executionScheduleStore.get(
        "adapter_handoffs",
        executionAdapterHandoffId
      ),
    listQueueItems:({executionScheduleId}) =>
      global.INFINICUS.ABA.executionScheduleStore.listByIndex(
        "queue",
        "executionScheduleId",
        executionScheduleId
      )
  });

  runtime.registerService(
    "aba.execution_scheduling_queue",
    api,
    {block:"ABA-16"}
  );

  runtime.registerRoute("aba.execution_schedule_policy.register",registerPolicy);
  runtime.registerRoute("aba.execution_schedule.create",createSchedule);
  runtime.registerRoute("aba.execution_schedule.state",updateScheduleState);
  runtime.registerRoute("aba.execution_queue.lease_next",leaseNext);

  runtime.registerBlock("ABA-16",{
    name:"Execution Scheduling and Action Queue Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionSchedulingQueueEngine=api;
})(window);
