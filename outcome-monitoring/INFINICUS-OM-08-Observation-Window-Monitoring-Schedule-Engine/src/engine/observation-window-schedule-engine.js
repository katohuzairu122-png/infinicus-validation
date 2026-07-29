(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.monitoringSchedulePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.monitoringScheduleStore.put(
      "policies",
      built.data
    );
  }

  function generateCheckpoints({
    monitoringScheduleId,
    metricId,
    startsAt,
    endsAt,
    cadenceMinutes,
    graceMinutes
  }){
    const checkpoints=[];
    let cursor=new Date(startsAt).getTime();
    const end=new Date(endsAt).getTime();
    const step=cadenceMinutes*60000;

    while(cursor<=end){
      checkpoints.push({
        monitoringCheckpointId:
          runtime.createId("om_monitoring_checkpoint"),
        monitoringScheduleId,
        metricId,
        scheduledAt:new Date(cursor).toISOString(),
        graceEndsAt:
          new Date(cursor+graceMinutes*60000).toISOString(),
        state:"pending",
        createdAt:new Date().toISOString()
      });

      cursor+=step;
    }

    return checkpoints;
  }

  async function createSchedules({
    monitoringScheduleHandoffId,
    monitoringSchedulePolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.baselineTargetRegistryEngine
        .getMonitoringScheduleHandoff({
          monitoringScheduleHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.monitoringScheduleStore.get(
        "policies",
        monitoringSchedulePolicyId
      );

    if(!policy.ok) return policy;

    const schedules=[];
    const checkpoints=[];

    for(const baseline of handoff.data.baselines){
      const target=
        handoff.data.targets.find(
          item=>item.metricId===baseline.metricId
        );

      if(!target){
        return runtime.failure(
          "OM_TARGET_NOT_FOUND",
          `No target found for metric: ${baseline.metricId}`
        );
      }

      const validation=
        global.INFINICUS.OM.monitoringScheduleValidator
          .validateDefinition({
            baseline,
            target,
            policy:policy.data
          });

      if(!validation.valid){
        return runtime.failure(
          "OM_MONITORING_SCHEDULE_INVALID",
          "Monitoring schedule failed validation.",
          {
            metricId:baseline.metricId,
            validation
          }
        );
      }

      const schedule={
        monitoringScheduleId:
          runtime.createId("om_monitoring_schedule"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:baseline.metricId,
        baselineDefinitionId:
          baseline.baselineDefinitionId,
        targetDefinitionId:
          target.targetDefinitionId,
        startsAt:validation.startsAt,
        endsAt:validation.endsAt,
        cadenceMinutes:validation.cadence,
        graceMinutes:policy.data.defaultGraceMinutes,
        allowLateObservation:
          policy.data.allowLateObservation,
        state:"scheduled",
        correlationId:handoff.data.correlationId,
        lineage:handoff.data.lineage.map(runtime.clone),
        confidence:handoff.data.confidence,
        version:1,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.monitoringScheduleStore.put(
        "schedules",
        schedule
      );

      const generated=generateCheckpoints({
        monitoringScheduleId:schedule.monitoringScheduleId,
        metricId:schedule.metricId,
        startsAt:schedule.startsAt,
        endsAt:schedule.endsAt,
        cadenceMinutes:schedule.cadenceMinutes,
        graceMinutes:schedule.graceMinutes
      });

      for(const checkpoint of generated){
        await global.INFINICUS.OM.monitoringScheduleStore.put(
          "checkpoints",
          checkpoint
        );
      }

      schedules.push(schedule);
      checkpoints.push(...generated);
    }

    const normalizationHandoff={
      normalizationHandoffId:
        runtime.createId("om_normalization_handoff"),
      targetBlock:"OM-09",
      monitoringContractId:
        handoff.data.monitoringContractId,
      schedules:schedules.map(runtime.clone),
      checkpoints:checkpoints.map(runtime.clone),
      acceptedObservations:
        handoff.data.acceptedObservations.map(runtime.clone),
      baselines:handoff.data.baselines.map(runtime.clone),
      targets:handoff.data.targets.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringScheduleStore.put(
      "normalization_handoffs",
      normalizationHandoff
    );

    await runtime.emit(
      "om.monitoring_schedules.created",
      {
        scheduleCount:schedules.length,
        checkpointCount:checkpoints.length,
        normalizationHandoffId:
          normalizationHandoff.normalizationHandoffId
      }
    );

    return runtime.success({
      schedules,
      checkpoints,
      normalizationHandoff
    });
  }

  async function changeState({
    monitoringScheduleId,
    nextState,
    reason=null
  }={}){
    const record=
      await global.INFINICUS.OM.monitoringScheduleStore.get(
        "schedules",
        monitoringScheduleId
      );

    if(!record.ok) return record;

    const allowed={
      scheduled:["collecting","paused","cancelled","expired"],
      collecting:["paused","completed","cancelled","expired"],
      paused:["scheduled","collecting","cancelled","expired"],
      completed:[],
      cancelled:[],
      expired:[]
    };

    if(!allowed[record.data.state]?.includes(nextState)){
      return runtime.failure(
        "OM_SCHEDULE_TRANSITION_INVALID",
        `Invalid schedule transition: ${record.data.state} -> ${nextState}`
      );
    }

    const updated={
      ...record.data,
      state:nextState,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringScheduleStore.put(
      "schedules",
      updated
    );

    await global.INFINICUS.OM.monitoringScheduleStore.put(
      "events",
      {
        monitoringScheduleEventId:
          runtime.createId("om_schedule_event"),
        monitoringScheduleId,
        fromState:record.data.state,
        toState:nextState,
        reason,
        occurredAt:new Date().toISOString()
      }
    );

    return runtime.success({schedule:updated});
  }

  const api=Object.freeze({
    registerPolicy,
    createSchedules,
    changeState,
    getSchedule:({monitoringScheduleId}) =>
      global.INFINICUS.OM.monitoringScheduleStore.get(
        "schedules",
        monitoringScheduleId
      ),
    getNormalizationHandoff:({normalizationHandoffId}) =>
      global.INFINICUS.OM.monitoringScheduleStore.get(
        "normalization_handoffs",
        normalizationHandoffId
      ),
    listCheckpoints:() =>
      global.INFINICUS.OM.monitoringScheduleStore.list(
        "checkpoints"
      )
  });

  runtime.registerService(
    "om.observation_window_monitoring_schedule",
    api,
    {block:"OM-08"}
  );

  runtime.registerRoute(
    "om.monitoring_schedule_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.monitoring_schedules.create",
    createSchedules
  );

  runtime.registerRoute(
    "om.monitoring_schedule.state_change",
    changeState
  );

  global.INFINICUS.OM.observationWindowScheduleEngine=api;
})(window);
