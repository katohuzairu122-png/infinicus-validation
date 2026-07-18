(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  async function registerPolicy(
    input = {}
  ) {
    const built =
      global.INFINICUS.DT
        .simulationPackagePolicyModel
        .create(input);

    if (!built.ok) return built;

    return global.INFINICUS.DT
      .simulationPublicationStore
      .put(
        "policies",
        built.data
      );
  }

  async function publish({
    simulationHandoffId,
    simulationPackagePolicyId
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .scenarioBaselineEngine
        .getSimulationHandoff({
          simulationHandoffId
        });

    if (!handoff.ok) return handoff;

    const policy =
      await global.INFINICUS.DT
        .simulationPublicationStore
        .get(
          "policies",
          simulationPackagePolicyId
        );

    if (!policy.ok) return policy;

    const validation =
      global.INFINICUS.DT
        .simulationPackageValidator
        .validate({
          handoff:
            handoff.data,
          policy:
            policy.data
        });

    if (!validation.valid) {
      const rejection = {
        simulationPackageRejectionId:
          runtime.createId(
            "dt_simulation_package_rejection"
          ),
        simulationHandoffId,
        simulationPackagePolicyId,
        businessId:
          handoff.data.businessId,
        twinId:
          handoff.data.twinId,
        scenarioId:
          handoff.data.scenarioId,
        issues:
          validation.issues,
        correlationId:
          handoff.data.correlationId,
        status:
          "rejected",
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.DT
        .simulationPublicationStore
        .put(
          "rejections",
          rejection
        );

      return runtime.failure(
        "SIMULATION_PACKAGE_REJECTED",
        "Simulation package validation failed.",
        rejection
      );
    }

    const prior =
      await global.INFINICUS.DT
        .simulationPublicationStore
        .list("publications");

    if (!prior.ok) return prior;

    const scenarioPublications =
      prior.data.filter(
        item =>
          item.scenarioId ===
          handoff.data.scenarioId
      );

    const version =
      scenarioPublications.length + 1;

    const partitions =
      global.INFINICUS.DT
        .simulationStatePartitioner
        .partition(
          handoff.data
            .effectiveScenarioState
        );

    const simulationPackageId =
      runtime.createId(
        "dt_simulation_package"
      );

    const manifest =
      global.INFINICUS.DT
        .simulationManifestBuilder
        .build({
          packageId:
            simulationPackageId,
          version,
          handoff:
            handoff.data,
          partitions,
          validation
        });

    const publication = {
      simulationPackageId,
      simulationHandoffId,
      simulationPackagePolicyId,
      packageVersion:
        version,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      scenarioId:
        handoff.data.scenarioId,
      scenarioBaselineId:
        handoff.data.scenarioBaselineId,
      manifest:
        runtime.clone(manifest),
      actualState:
        partitions.actual.map(runtime.clone),
      assumedState:
        partitions.assumed.map(runtime.clone),
      simulatedState:
        partitions.simulated.map(runtime.clone),
      initialConditions:
        handoff.data.initialConditions.map(runtime.clone),
      businessEvents:
        handoff.data.businessEvents.map(runtime.clone),
      opportunities:
        handoff.data.opportunities.map(runtime.clone),
      vulnerabilities:
        handoff.data.vulnerabilities.map(runtime.clone),
      breaches:
        handoff.data.breaches.map(runtime.clone),
      readiness:
        runtime.clone(handoff.data.readiness),
      integrityValidation:
        runtime.clone(
          handoff.data.integrityValidation
        ),
      correlationId:
        handoff.data.correlationId,
      status:
        "published",
      publishedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .simulationPublicationStore
      .put(
        "publications",
        publication
      );

    const simulationEngineHandoff = {
      simulationEngineHandoffId:
        runtime.createId(
          "simulation_engine_handoff"
        ),
      sourceLayer:
        "BUSINESS_DIGITAL_TWIN",
      sourceBlock:
        "DT-24",
      targetLayer:
        "SIMULATION_ENGINE",
      contractVersion:
        "1.0.0",
      simulationPackageId:
        publication.simulationPackageId,
      packageVersion:
        publication.packageVersion,
      manifest:
        runtime.clone(publication.manifest),
      actualState:
        publication.actualState.map(runtime.clone),
      assumedState:
        publication.assumedState.map(runtime.clone),
      simulatedState:
        publication.simulatedState.map(runtime.clone),
      initialConditions:
        publication.initialConditions.map(runtime.clone),
      businessEvents:
        publication.businessEvents.map(runtime.clone),
      opportunities:
        publication.opportunities.map(runtime.clone),
      vulnerabilities:
        publication.vulnerabilities.map(runtime.clone),
      breaches:
        publication.breaches.map(runtime.clone),
      correlationId:
        publication.correlationId,
      status:
        "ready_for_simulation",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .simulationPublicationStore
      .put(
        "engine_handoffs",
        simulationEngineHandoff
      );

    await runtime.emit(
      "dt.simulation_package.published",
      {
        publication,
        simulationEngineHandoffId:
          simulationEngineHandoff
            .simulationEngineHandoffId
      }
    );

    return runtime.success({
      publication,
      simulationEngineHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    publish,
    getSimulationPackage: ({
      simulationPackageId
    }) =>
      global.INFINICUS.DT
        .simulationPublicationStore
        .get(
          "publications",
          simulationPackageId
        ),
    getSimulationEngineHandoff: ({
      simulationEngineHandoffId
    }) =>
      global.INFINICUS.DT
        .simulationPublicationStore
        .get(
          "engine_handoffs",
          simulationEngineHandoffId
        ),
    listSimulationPackages: () =>
      global.INFINICUS.DT
        .simulationPublicationStore
        .list("publications"),
    listRejections: () =>
      global.INFINICUS.DT
        .simulationPublicationStore
        .list("rejections")
  });

  runtime.registerService(
    "dt.simulation_package_publication",
    api,
    { block: "DT-24" }
  );

  runtime.registerRoute(
    "dt.simulation_package_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "dt.simulation_package.publish",
    publish
  );

  global.INFINICUS.DT
    .simulationPackagePublicationEngine =
      api;
})(window);
