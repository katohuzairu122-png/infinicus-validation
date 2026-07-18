(function(global){
  "use strict";

  const OM=global.INFINICUS.OM;

  const runtime=Object.freeze({
    success:OM.resultEnvelope.success,
    failure:OM.resultEnvelope.failure,
    createId:OM.idFactory.createId,
    clone:value=>structuredClone(value),
    registerService:OM.serviceRegistry.register,
    getService:OM.serviceRegistry.get,
    listServices:OM.serviceRegistry.list,
    registerRoute:OM.routeRegistry.register,
    dispatch:OM.routeRegistry.dispatch,
    listRoutes:OM.routeRegistry.list,
    subscribe:OM.eventBus.subscribe,
    emit:OM.eventBus.emit,
    listEvents:OM.eventBus.listHistory,
    lifecycle:OM.lifecycleRegistry,
    registerMetric:OM.metricRegistry.register,
    getMetric:OM.metricRegistry.get,
    listMetrics:OM.metricRegistry.list,
    registerObservationSource:OM.observationSourceRegistry.register,
    getObservationSource:OM.observationSourceRegistry.get,
    listObservationSources:OM.observationSourceRegistry.list,
    registerMonitoringContract:OM.monitoringContractRegistry.register,
    getMonitoringContract:OM.monitoringContractRegistry.get,
    listMonitoringContracts:OM.monitoringContractRegistry.list,
    registerOutcomeState:OM.outcomeStateRegistry.register,
    getOutcomeState:OM.outcomeStateRegistry.get,
    listOutcomeStates:OM.outcomeStateRegistry.list,
    getBlockManifest:() =>
      OM.resultEnvelope.success(
        OM.blockManifest.map(structuredClone)
      ),
    diagnose:OM.diagnostics.run
  });

  OM.runtime=runtime;

  runtime.registerService(
    "om.core_runtime",
    runtime,
    {
      block:"OM-01",
      version:"1.0.0"
    }
  );

  runtime.registerRoute(
    "om.runtime.diagnose",
    async()=>runtime.diagnose(),
    {block:"OM-01"}
  );

  runtime.registerRoute(
    "om.runtime.manifest",
    async()=>runtime.getBlockManifest(),
    {block:"OM-01"}
  );

  runtime.emit("om.runtime.ready",{
    block:"OM-01",
    version:"1.0.0"
  });
})(window);
