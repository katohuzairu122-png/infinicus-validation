(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerFromHandoff({
    metricRegistryHandoffId
  }={}){
    const handoff=
      await global.INFINICUS.OM.monitoringContractIntakeEngine
        .getMetricRegistryHandoff({metricRegistryHandoffId});

    if(!handoff.ok) return handoff;

    const registered=[];
    const sourceBindings=[];

    for(const item of handoff.data.metrics){
      const built=
        global.INFINICUS.OM.metricDefinitionModel.create({
          monitoringContractId:
            handoff.data.monitoringContractId,
          outcomeDefinition:item.outcomeDefinition,
          metric:item.metric,
          source:item.source,
          correlationId:handoff.data.correlationId,
          lineage:handoff.data.lineage,
          confidence:handoff.data.confidence
        });

      if(!built.ok) return built;

      const validation=
        global.INFINICUS.OM.metricDefinitionValidator.validate(
          built.data
        );

      if(!validation.valid){
        return runtime.failure(
          "OM_METRIC_DEFINITION_INVALID",
          "Metric definition failed validation.",
          validation
        );
      }

      const duplicate=
        await global.INFINICUS.OM.metricKPIStore
          .getByCode(built.data.code);

      if(duplicate.ok){
        return runtime.failure(
          "OM_METRIC_CODE_DUPLICATE",
          `Metric code is already registered: ${built.data.code}`,
          {
            existingMetricId:duplicate.data.metricId
          }
        );
      }

      await global.INFINICUS.OM.metricKPIStore.put(
        "metrics",
        built.data
      );

      await global.INFINICUS.OM.metricKPIStore.put(
        "versions",
        {
          metricVersionId:runtime.createId("om_metric_version"),
          metricId:built.data.metricId,
          version:built.data.version,
          snapshot:runtime.clone(built.data),
          createdAt:new Date().toISOString()
        }
      );

      runtime.registerMetric(runtime.clone(built.data));

      const binding={
        metricSourceBindingId:
          runtime.createId("om_metric_source_binding"),
        metricId:built.data.metricId,
        observationSourceReference:
          built.data.observationSourceReference,
        sourceField:built.data.sourceField,
        valueType:built.data.valueType,
        unit:built.data.unit,
        aggregation:built.data.aggregation,
        status:"active",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.metricKPIStore.put(
        "source_bindings",
        binding
      );

      registered.push(runtime.clone(built.data));
      sourceBindings.push(runtime.clone(binding));
    }

    const sourceHandoff={
      observationSourceHandoffId:
        runtime.createId("om_observation_source_handoff"),
      targetBlock:"OM-04",
      monitoringContractId:
        handoff.data.monitoringContractId,
      metrics:registered.map(runtime.clone),
      sourceBindings:sourceBindings.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.metricKPIStore.put(
      "source_handoffs",
      sourceHandoff
    );

    await runtime.emit(
      "om.metrics.registered",
      {
        metricCount:registered.length,
        observationSourceHandoffId:
          sourceHandoff.observationSourceHandoffId
      }
    );

    return runtime.success({
      metrics:registered,
      sourceBindings,
      observationSourceHandoff:sourceHandoff
    });
  }

  async function retire({
    metricId,
    reason=null
  }={}){
    const metric=
      await global.INFINICUS.OM.metricKPIStore.get(
        "metrics",
        metricId
      );

    if(!metric.ok) return metric;

    const retired={
      ...metric.data,
      status:"retired",
      retirementReason:reason,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.metricKPIStore.put(
      "metrics",
      retired
    );

    return runtime.success({metric:retired});
  }

  const api=Object.freeze({
    registerFromHandoff,
    retire,
    getMetric:({metricId}) =>
      global.INFINICUS.OM.metricKPIStore.get(
        "metrics",
        metricId
      ),
    getObservationSourceHandoff:({
      observationSourceHandoffId
    }) =>
      global.INFINICUS.OM.metricKPIStore.get(
        "source_handoffs",
        observationSourceHandoffId
      ),
    listMetrics:() =>
      global.INFINICUS.OM.metricKPIStore.list("metrics")
  });

  runtime.registerService(
    "om.metric_kpi_registry",
    api,
    {block:"OM-03"}
  );

  runtime.registerRoute(
    "om.metrics.register_from_handoff",
    registerFromHandoff
  );

  runtime.registerRoute(
    "om.metric.retire",
    retire
  );

  global.INFINICUS.OM.metricKPIRegistryEngine=api;
})(window);
