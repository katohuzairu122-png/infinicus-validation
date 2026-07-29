(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerSource(input={}){
    const built=
      global.INFINICUS.OM.observationSourceModel.create(input);

    if(!built.ok) return built;

    const stored=
      await global.INFINICUS.OM.observationSourceRegistryStore.put(
        "sources",
        built.data
      );

    if(stored.ok){
      runtime.registerObservationSource(runtime.clone(built.data));
    }

    return stored;
  }

  async function registerConnector(input={}){
    const built=
      global.INFINICUS.OM.observationConnectorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.observationSourceRegistryStore.put(
      "connectors",
      built.data
    );
  }

  async function bindFromHandoff({
    observationSourceHandoffId,
    sourceMappings=[]
  }={}){
    const handoff=
      await global.INFINICUS.OM.metricKPIRegistryEngine
        .getObservationSourceHandoff({
          observationSourceHandoffId
        });

    if(!handoff.ok) return handoff;

    const bindings=[];

    for(const metric of handoff.data.metrics){
      const mapping=
        sourceMappings.find(item=>item.metricId===metric.metricId);

      if(!mapping){
        return runtime.failure(
          "OM_SOURCE_MAPPING_REQUIRED",
          `Source mapping is required for metric: ${metric.metricId}`
        );
      }

      const source=
        await global.INFINICUS.OM.observationSourceRegistryStore.get(
          "sources",
          mapping.observationSourceId
        );

      if(!source.ok) return source;

      const connector=
        await global.INFINICUS.OM.observationSourceRegistryStore.get(
          "connectors",
          mapping.observationConnectorId
        );

      if(!connector.ok) return connector;

      const validation=
        global.INFINICUS.OM.sourceBindingValidator.validate({
          metric,
          source:source.data,
          connector:connector.data
        });

      if(!validation.valid){
        return runtime.failure(
          "OM_SOURCE_BINDING_INVALID",
          "Metric source binding failed validation.",
          {
            metricId:metric.metricId,
            validation
          }
        );
      }

      const binding={
        observationSourceBindingId:
          runtime.createId("om_observation_source_binding"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:metric.metricId,
        observationSourceId:source.data.observationSourceId,
        observationConnectorId:
          connector.data.observationConnectorId,
        sourceField:
          mapping.sourceField || metric.sourceField || null,
        valueType:metric.valueType,
        unit:metric.unit,
        aggregation:metric.aggregation,
        refreshCadenceMinutes:
          source.data.refreshCadenceMinutes,
        freshnessToleranceMinutes:
          source.data.freshnessToleranceMinutes,
        dataQualityMinimum:
          source.data.dataQualityMinimum,
        correlationId:handoff.data.correlationId,
        status:"active",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.observationSourceRegistryStore.put(
        "bindings",
        binding
      );

      bindings.push(binding);
    }

    const collectionHandoff={
      observationCollectionHandoffId:
        runtime.createId("om_observation_collection_handoff"),
      targetBlock:"OM-05",
      monitoringContractId:
        handoff.data.monitoringContractId,
      metrics:handoff.data.metrics.map(runtime.clone),
      sourceBindings:bindings.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.observationSourceRegistryStore.put(
      "collection_handoffs",
      collectionHandoff
    );

    await runtime.emit(
      "om.observation_sources.bound",
      {
        bindingCount:bindings.length,
        observationCollectionHandoffId:
          collectionHandoff.observationCollectionHandoffId
      }
    );

    return runtime.success({
      bindings,
      observationCollectionHandoff:collectionHandoff
    });
  }

  async function updateHealth({
    recordType,
    recordId,
    healthStatus
  }={}){
    const storeName=
      recordType==="connector" ? "connectors" : "sources";

    const record=
      await global.INFINICUS.OM.observationSourceRegistryStore.get(
        storeName,
        recordId
      );

    if(!record.ok) return record;

    const updated={
      ...record.data,
      healthStatus:String(healthStatus || "unknown"),
      updatedAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.observationSourceRegistryStore.put(
      storeName,
      updated
    );
  }

  const api=Object.freeze({
    registerSource,
    registerConnector,
    bindFromHandoff,
    updateHealth,
    getSource:({observationSourceId}) =>
      global.INFINICUS.OM.observationSourceRegistryStore.get(
        "sources",
        observationSourceId
      ),
    getConnector:({observationConnectorId}) =>
      global.INFINICUS.OM.observationSourceRegistryStore.get(
        "connectors",
        observationConnectorId
      ),
    getObservationCollectionHandoff:({
      observationCollectionHandoffId
    }) =>
      global.INFINICUS.OM.observationSourceRegistryStore.get(
        "collection_handoffs",
        observationCollectionHandoffId
      ),
    listBindings:() =>
      global.INFINICUS.OM.observationSourceRegistryStore.list(
        "bindings"
      )
  });

  runtime.registerService(
    "om.observation_source_connector_registry",
    api,
    {block:"OM-04"}
  );

  runtime.registerRoute(
    "om.observation_source.register",
    registerSource
  );

  runtime.registerRoute(
    "om.observation_connector.register",
    registerConnector
  );

  runtime.registerRoute(
    "om.observation_sources.bind_from_handoff",
    bindFromHandoff
  );

  runtime.registerRoute(
    "om.observation_source_health.update",
    updateHealth
  );

  global.INFINICUS.OM.observationSourceConnectorRegistryEngine=api;
})(window);
