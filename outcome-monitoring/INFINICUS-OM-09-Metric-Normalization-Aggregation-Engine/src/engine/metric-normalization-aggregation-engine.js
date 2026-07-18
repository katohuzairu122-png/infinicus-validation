(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const converters=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.metricNormalizationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.metricNormalizationStore.put(
      "policies",
      built.data
    );
  }

  function registerConverter({
    sourceUnit,
    targetUnit,
    converter
  }={}){
    if(!sourceUnit || !targetUnit || typeof converter!=="function"){
      return runtime.failure(
        "OM_UNIT_CONVERTER_INVALID",
        "Source unit, target unit, and converter are required."
      );
    }

    const key=`${sourceUnit}->${targetUnit}`;
    converters.set(key,converter);

    return runtime.success({key});
  }

  async function normalizeAndAggregate({
    normalizationHandoffId,
    metricNormalizationPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.observationWindowScheduleEngine
        .getNormalizationHandoff({
          normalizationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.metricNormalizationStore.get(
        "policies",
        metricNormalizationPolicyId
      );

    if(!policy.ok) return policy;

    const normalized=[];
    const aggregates=[];

    for(const schedule of handoff.data.schedules){
      const baseline=
        handoff.data.baselines.find(
          item=>item.metricId===schedule.metricId
        );

      const target=
        handoff.data.targets.find(
          item=>item.metricId===schedule.metricId
        );

      const accepted=
        handoff.data.acceptedObservations.filter(
          item=>item.observation.metricId===schedule.metricId
        );

      const metricValues=[];

      for(const acceptedItem of accepted){
        const observation=acceptedItem.observation;
        const converter=
          converters.get(
            `${observation.unit}->${target.unit}`
          );

        const result=
          global.INFINICUS.OM.metricNormalizationValidator
            .normalizeValue({
              value:observation.value,
              sourceUnit:observation.unit,
              targetUnit:target.unit,
              valueType:
                typeof observation.value==="number"
                  ? "number"
                  : "string",
              converter,
              policy:policy.data
            });

        if(!result.valid){
          return runtime.failure(
            "OM_METRIC_NORMALIZATION_FAILED",
            "Metric observation failed normalization.",
            {
              observationId:observation.observationId,
              issues:result.issues
            }
          );
        }

        const record={
          normalizedObservationId:
            runtime.createId("om_normalized_observation"),
          sourceObservationId:observation.observationId,
          metricId:schedule.metricId,
          monitoringScheduleId:
            schedule.monitoringScheduleId,
          value:result.normalized,
          unit:target.unit,
          classification:"calculated",
          derivationType:"normalization",
          sourceTimestamp:observation.sourceTimestamp,
          correlationId:handoff.data.correlationId,
          lineage:[
            ...observation.lineage.map(runtime.clone),
            {
              sourceType:"normalized_observation",
              sourceObservationId:
                observation.observationId
            }
          ],
          confidence:acceptedItem.adjustedConfidence,
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.metricNormalizationStore.put(
          "normalized",
          record
        );

        normalized.push(record);
        metricValues.push(record.value);
      }

      const aggregationMode=
        target.aggregation ||
        baseline.aggregation ||
        "latest";

      const aggregateValue=
        global.INFINICUS.OM.metricAggregation.aggregate(
          metricValues,
          aggregationMode
        );

      const aggregate={
        metricAggregateId:
          runtime.createId("om_metric_aggregate"),
        metricId:schedule.metricId,
        monitoringScheduleId:
          schedule.monitoringScheduleId,
        baselineDefinitionId:
          baseline.baselineDefinitionId,
        targetDefinitionId:
          target.targetDefinitionId,
        aggregationMode,
        aggregateValue,
        unit:target.unit,
        observationCount:metricValues.length,
        classification:"calculated",
        derivationType:"aggregation",
        correlationId:handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...normalized
            .filter(item=>item.metricId===schedule.metricId)
            .map(item=>({
              sourceType:"normalized_observation",
              sourceId:item.normalizedObservationId
            }))
        ],
        confidence:
          accepted.length
            ? Number(
                (
                  accepted.reduce(
                    (sum,item)=>sum+item.adjustedConfidence,
                    0
                  ) / accepted.length
                ).toFixed(4)
              )
            : 0,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.metricNormalizationStore.put(
        "aggregates",
        aggregate
      );

      aggregates.push(aggregate);
    }

    const progressHandoff={
      outcomeProgressHandoffId:
        runtime.createId("om_outcome_progress_handoff"),
      targetBlock:"OM-10",
      monitoringContractId:
        handoff.data.monitoringContractId,
      schedules:handoff.data.schedules.map(runtime.clone),
      baselines:handoff.data.baselines.map(runtime.clone),
      targets:handoff.data.targets.map(runtime.clone),
      normalizedObservations:normalized.map(runtime.clone),
      metricAggregates:aggregates.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:
        aggregates.length
          ? Number(
              (
                aggregates.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / aggregates.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.metricNormalizationStore.put(
      "progress_handoffs",
      progressHandoff
    );

    await runtime.emit(
      "om.metrics.normalized_aggregated",
      {
        normalizedCount:normalized.length,
        aggregateCount:aggregates.length,
        outcomeProgressHandoffId:
          progressHandoff.outcomeProgressHandoffId
      }
    );

    return runtime.success({
      normalizedObservations:normalized,
      metricAggregates:aggregates,
      outcomeProgressHandoff:progressHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerConverter,
    normalizeAndAggregate,
    getOutcomeProgressHandoff:({
      outcomeProgressHandoffId
    }) =>
      global.INFINICUS.OM.metricNormalizationStore.get(
        "progress_handoffs",
        outcomeProgressHandoffId
      ),
    listNormalizedObservations:() =>
      global.INFINICUS.OM.metricNormalizationStore.list(
        "normalized"
      ),
    listMetricAggregates:() =>
      global.INFINICUS.OM.metricNormalizationStore.list(
        "aggregates"
      )
  });

  runtime.registerService(
    "om.metric_normalization_aggregation",
    api,
    {block:"OM-09"}
  );

  runtime.registerRoute(
    "om.metric_normalization_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.metrics.normalize_aggregate",
    normalizeAndAggregate
  );

  global.INFINICUS.OM.metricNormalizationAggregationEngine=api;
})(window);
