(function (global) {
  "use strict";

  function build({
    packageId,
    version,
    handoff,
    partitions,
    validation
  }) {
    return {
      packageId,
      packageVersion:
        version,
      packageType:
        "INFINICUS_BUSINESS_DIGITAL_TWIN_SIMULATION_PACKAGE",
      contractVersion:
        "1.0.0",
      businessId:
        handoff.businessId,
      twinId:
        handoff.twinId,
      scenarioId:
        handoff.scenarioId,
      scenarioBaselineId:
        handoff.scenarioBaselineId,
      historicalSnapshotId:
        handoff.historicalSnapshotId,
      historicalSnapshotVersion:
        handoff.historicalSnapshotVersion,
      historicalSnapshotChecksum:
        handoff.historicalSnapshotChecksum,
      scenarioChecksum:
        handoff.scenarioChecksum,
      horizonDays:
        handoff.scenario.horizonDays,
      timeStep:
        handoff.scenario.timeStep,
      seed:
        handoff.scenario.seed,
      counts: {
        actual:
          partitions.actual.length,
        assumed:
          partitions.assumed.length,
        simulated:
          partitions.simulated.length,
        conditions:
          handoff.initialConditions.length,
        events:
          handoff.businessEvents.length,
        opportunities:
          handoff.opportunities.length,
        vulnerabilities:
          handoff.vulnerabilities.length,
        breaches:
          handoff.breaches.length
      },
      validation:
        structuredClone(validation),
      createdAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.DT.simulationManifestBuilder =
    Object.freeze({ build });
})(window);
