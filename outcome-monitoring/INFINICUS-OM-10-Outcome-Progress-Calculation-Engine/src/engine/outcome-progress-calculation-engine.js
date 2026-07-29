(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeProgressPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeProgressStore.put(
      "policies",
      built.data
    );
  }

  function classify({
    progressRatio,
    achieved,
    confidence,
    policy
  }){
    if(confidence<policy.minimumConfidence){
      return "low_confidence";
    }

    if(achieved || progressRatio>=policy.completionThreshold){
      return "achieved";
    }

    if(progressRatio>=policy.warningThreshold){
      return "on_track";
    }

    if(progressRatio>0){
      return "behind";
    }

    return "not_progressing";
  }

  async function calculateProgress({
    outcomeProgressHandoffId,
    outcomeProgressPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.metricNormalizationAggregationEngine
        .getOutcomeProgressHandoff({
          outcomeProgressHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeProgressStore.get(
        "policies",
        outcomeProgressPolicyId
      );

    if(!policy.ok) return policy;

    const progressRecords=[];
    const states=[];

    for(const aggregate of handoff.data.metricAggregates){
      const baseline=
        handoff.data.baselines.find(
          item=>item.metricId===aggregate.metricId
        );

      const target=
        handoff.data.targets.find(
          item=>item.metricId===aggregate.metricId
        );

      if(!baseline || !target){
        return runtime.failure(
          "OM_PROGRESS_REFERENCE_MISSING",
          `Baseline or target missing for metric: ${aggregate.metricId}`
        );
      }

      const calculated=
        global.INFINICUS.OM.outcomeProgressCalculator.calculate({
          baselineValue:baseline.value,
          currentValue:aggregate.aggregateValue,
          targetValue:target.targetValue,
          minimumAcceptableValue:
            target.minimumAcceptableValue,
          maximumAcceptableValue:
            target.maximumAcceptableValue,
          direction:target.direction,
          tolerance:target.tolerance
        });

      if(!calculated.valid){
        return runtime.failure(
          "OM_PROGRESS_CALCULATION_FAILED",
          "Outcome progress calculation failed.",
          {
            metricId:aggregate.metricId,
            issues:calculated.issues
          }
        );
      }

      let progressRatio=calculated.progressRatio;

      if(
        policy.data.capProgressAtOne &&
        progressRatio>1
      ){
        progressRatio=1;
      }

      const confidence=
        Number(
          Math.min(
            aggregate.confidence,
            baseline.confidence,
            target.confidence,
            handoff.data.confidence
          ).toFixed(4)
        );

      const state=
        classify({
          progressRatio,
          achieved:calculated.achieved,
          confidence,
          policy:policy.data
        });

      const progress={
        outcomeProgressId:
          runtime.createId("om_outcome_progress"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:aggregate.metricId,
        monitoringScheduleId:
          aggregate.monitoringScheduleId,
        metricAggregateId:
          aggregate.metricAggregateId,
        baselineDefinitionId:
          baseline.baselineDefinitionId,
        targetDefinitionId:
          target.targetDefinitionId,
        baselineValue:calculated.baselineValue,
        currentValue:calculated.currentValue,
        targetValue:calculated.targetValue,
        progressRatio:
          Number(progressRatio.toFixed(6)),
        progressPercent:
          Number((progressRatio*100).toFixed(2)),
        targetGap:calculated.targetGap,
        achieved:calculated.achieved,
        withinAcceptableRange:
          calculated.withinAcceptableRange,
        direction:calculated.direction,
        classification:"calculated",
        progressState:state,
        confidence,
        correlationId:handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          {
            sourceType:"metric_aggregate",
            sourceId:aggregate.metricAggregateId
          }
        ],
        calculatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeProgressStore.put(
        "progress",
        progress
      );

      const stateRecord={
        outcomeProgressStateId:
          runtime.createId("om_outcome_progress_state"),
        outcomeProgressId:progress.outcomeProgressId,
        metricId:progress.metricId,
        state,
        achieved:progress.achieved,
        confidence,
        correlationId:progress.correlationId,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeProgressStore.put(
        "states",
        stateRecord
      );

      runtime.registerOutcomeState({
        outcomeStateId:stateRecord.outcomeProgressStateId,
        metricId:progress.metricId,
        state,
        confidence
      });

      progressRecords.push(progress);
      states.push(stateRecord);
    }

    const varianceHandoff={
      varianceThresholdHandoffId:
        runtime.createId("om_variance_threshold_handoff"),
      targetBlock:"OM-11",
      monitoringContractId:
        handoff.data.monitoringContractId,
      progressRecords:progressRecords.map(runtime.clone),
      progressStates:states.map(runtime.clone),
      baselines:handoff.data.baselines.map(runtime.clone),
      targets:handoff.data.targets.map(runtime.clone),
      metricAggregates:
        handoff.data.metricAggregates.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:
        progressRecords.length
          ? Number(
              (
                progressRecords.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / progressRecords.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeProgressStore.put(
      "variance_handoffs",
      varianceHandoff
    );

    await runtime.emit(
      "om.outcome_progress.calculated",
      {
        progressCount:progressRecords.length,
        varianceThresholdHandoffId:
          varianceHandoff.varianceThresholdHandoffId
      }
    );

    return runtime.success({
      progressRecords,
      progressStates:states,
      varianceThresholdHandoff:varianceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    calculateProgress,
    getProgress:({outcomeProgressId}) =>
      global.INFINICUS.OM.outcomeProgressStore.get(
        "progress",
        outcomeProgressId
      ),
    getVarianceThresholdHandoff:({
      varianceThresholdHandoffId
    }) =>
      global.INFINICUS.OM.outcomeProgressStore.get(
        "variance_handoffs",
        varianceThresholdHandoffId
      ),
    listProgress:() =>
      global.INFINICUS.OM.outcomeProgressStore.list(
        "progress"
      )
  });

  runtime.registerService(
    "om.outcome_progress_calculation",
    api,
    {block:"OM-10"}
  );

  runtime.registerRoute(
    "om.outcome_progress_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_progress.calculate",
    calculateProgress
  );

  global.INFINICUS.OM.outcomeProgressCalculationEngine=api;
})(window);
