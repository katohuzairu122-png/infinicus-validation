(function(global){
  "use strict";

  const factory=global.INFINICUS.OM.genericRegistryFactory;

  global.INFINICUS.OM.metricRegistry=
    factory.createRegistry({
      registryName:"Metric Registry",
      idField:"metricId"
    });

  global.INFINICUS.OM.observationSourceRegistry=
    factory.createRegistry({
      registryName:"Observation Source Registry",
      idField:"observationSourceId"
    });

  global.INFINICUS.OM.monitoringContractRegistry=
    factory.createRegistry({
      registryName:"Monitoring Contract Registry",
      idField:"monitoringContractId"
    });

  global.INFINICUS.OM.outcomeStateRegistry=
    factory.createRegistry({
      registryName:"Outcome State Registry",
      idField:"outcomeStateId"
    });
})(window);
