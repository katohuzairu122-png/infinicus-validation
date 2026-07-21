(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerFromHandoff({
    baselineTargetHandoffId
  }={}){
    const handoff=
      await global.INFINICUS.OM.dataQualityEvidenceValidationEngine
        .getBaselineTargetHandoff({
          baselineTargetHandoffId
        });

    if(!handoff.ok) return handoff;

    const baselines=[];
    const targets=[];
    const metricIds=[
      ...new Set(
        handoff.data.acceptedObservations.map(
          item=>item.observation.metricId
        )
      )
    ];

    for(const metricId of metricIds){
      const metric=
        await global.INFINICUS.OM.metricKPIRegistryEngine
          .getMetric({metricId});

      if(!metric.ok) return metric;

      const baselineBuilt=
        global.INFINICUS.OM.baselineDefinitionModel.create({
          metricId,
          monitoringContractId:
            metric.data.monitoringContractId,
          expectedOutcomeDefinitionId:
            metric.data.expectedOutcomeDefinitionId,
          value:metric.data.baselineValue,
          unit:metric.data.unit,
          effectiveFrom:
            metric.data.observationWindow?.startsAt,
          effectiveTo:
            metric.data.observationWindow?.endsAt,
          provenanceType:"monitoring_contract",
          provenanceReference:
            metric.data.monitoringContractId,
          confidence:
            Math.min(
              metric.data.confidence,
              handoff.data.confidence
            ),
          lineage:[
            ...metric.data.lineage.map(runtime.clone),
            ...handoff.data.lineage.map(runtime.clone)
          ]
        });

      if(!baselineBuilt.ok) return baselineBuilt;

      const baselineValidation=
        global.INFINICUS.OM.baselineTargetValidator
          .validateBaseline(baselineBuilt.data);

      if(!baselineValidation.valid){
        return runtime.failure(
          "OM_BASELINE_INVALID",
          "Baseline failed validation.",
          baselineValidation
        );
      }

      const targetBuilt=
        global.INFINICUS.OM.targetDefinitionModel.create({
          metricId,
          monitoringContractId:
            metric.data.monitoringContractId,
          expectedOutcomeDefinitionId:
            metric.data.expectedOutcomeDefinitionId,
          targetValue:metric.data.targetValue,
          minimumAcceptableValue:
            metric.data.minimumAcceptableValue,
          maximumAcceptableValue:
            metric.data.maximumAcceptableValue,
          tolerance:metric.data.tolerance,
          direction:metric.data.direction,
          unit:metric.data.unit,
          effectiveFrom:
            metric.data.observationWindow?.startsAt,
          effectiveTo:
            metric.data.observationWindow?.endsAt,
          provenanceType:"monitoring_contract",
          provenanceReference:
            metric.data.monitoringContractId,
          confidence:
            Math.min(
              metric.data.confidence,
              handoff.data.confidence
            ),
          lineage:[
            ...metric.data.lineage.map(runtime.clone),
            ...handoff.data.lineage.map(runtime.clone)
          ]
        });

      if(!targetBuilt.ok) return targetBuilt;

      const targetValidation=
        global.INFINICUS.OM.baselineTargetValidator
          .validateTarget(targetBuilt.data);

      if(!targetValidation.valid){
        return runtime.failure(
          "OM_TARGET_INVALID",
          "Target failed validation.",
          targetValidation
        );
      }

      await global.INFINICUS.OM.baselineTargetStore.put(
        "baselines",
        baselineBuilt.data
      );

      await global.INFINICUS.OM.baselineTargetStore.put(
        "targets",
        targetBuilt.data
      );

      await global.INFINICUS.OM.baselineTargetStore.put(
        "versions",
        {
          baselineTargetVersionId:
            runtime.createId("om_baseline_target_version"),
          metricId,
          baselineSnapshot:
            runtime.clone(baselineBuilt.data),
          targetSnapshot:
            runtime.clone(targetBuilt.data),
          version:1,
          createdAt:new Date().toISOString()
        }
      );

      baselines.push(baselineBuilt.data);
      targets.push(targetBuilt.data);
    }

    const scheduleHandoff={
      monitoringScheduleHandoffId:
        runtime.createId("om_monitoring_schedule_handoff"),
      targetBlock:"OM-08",
      monitoringContractId:
        handoff.data.monitoringContractId,
      baselines:baselines.map(runtime.clone),
      targets:targets.map(runtime.clone),
      acceptedObservations:
        handoff.data.acceptedObservations.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.baselineTargetStore.put(
      "schedule_handoffs",
      scheduleHandoff
    );

    await runtime.emit(
      "om.baselines_targets.registered",
      {
        baselineCount:baselines.length,
        targetCount:targets.length,
        monitoringScheduleHandoffId:
          scheduleHandoff.monitoringScheduleHandoffId
      }
    );

    return runtime.success({
      baselines,
      targets,
      monitoringScheduleHandoff:scheduleHandoff
    });
  }

  const api=Object.freeze({
    registerFromHandoff,
    getBaseline:({baselineDefinitionId}) =>
      global.INFINICUS.OM.baselineTargetStore.get(
        "baselines",
        baselineDefinitionId
      ),
    getTarget:({targetDefinitionId}) =>
      global.INFINICUS.OM.baselineTargetStore.get(
        "targets",
        targetDefinitionId
      ),
    getMonitoringScheduleHandoff:({
      monitoringScheduleHandoffId
    }) =>
      global.INFINICUS.OM.baselineTargetStore.get(
        "schedule_handoffs",
        monitoringScheduleHandoffId
      ),
    listBaselines:() =>
      global.INFINICUS.OM.baselineTargetStore.list("baselines"),
    listTargets:() =>
      global.INFINICUS.OM.baselineTargetStore.list("targets")
  });

  runtime.registerService(
    "om.baseline_target_registry",
    api,
    {block:"OM-07"}
  );

  runtime.registerRoute(
    "om.baselines_targets.register_from_handoff",
    registerFromHandoff
  );

  global.INFINICUS.OM.baselineTargetRegistryEngine=api;
})(window);
