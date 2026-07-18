(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  async function createScenario({
    scenarioHandoffId,
    scenarioInput,
    conditionInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .historicalSnapshotTimelineEngine
        .getScenarioHandoff({
          scenarioHandoffId
        });

    if (!handoff.ok) return handoff;

    const scenario =
      global.INFINICUS.DT
        .scenarioDefinitionModel
        .create({
          ...scenarioInput,
          twinId:
            handoff.data.twinId,
          businessId:
            handoff.data.businessId,
          historicalSnapshotId:
            handoff.data.historicalSnapshotId
        });

    if (!scenario.ok) return scenario;

    const conditions = [];

    for (const input of conditionInputs) {
      const built =
        global.INFINICUS.DT
          .initialConditionModel
          .create({
            ...input,
            scenarioId:
              scenario.data.scenarioId
          });

      if (!built.ok) return built;

      conditions.push(
        built.data
      );
    }

    const baselineState =
      global.INFINICUS.DT
        .scenarioBaselineBuilder
        .build({
          state:
            handoff.data.baselineState
        });

    const validation =
      global.INFINICUS.DT
        .scenarioValidator
        .validate({
          scenario:
            scenario.data,
          baselineState,
          conditions
        });

    if (!validation.valid) {
      return runtime.failure(
        "SCENARIO_BASELINE_INVALID",
        "Scenario baseline validation failed.",
        validation
      );
    }

    await global.INFINICUS.DT
      .scenarioStore
      .put(
        "scenarios",
        scenario.data
      );

    for (const condition of conditions) {
      await global.INFINICUS.DT
        .scenarioStore
        .put(
          "conditions",
          condition
        );
    }

    const effectiveState =
      global.INFINICUS.DT
        .scenarioBaselineBuilder
        .applyConditions(
          baselineState,
          conditions
        );

    const scenarioBaseline = {
      scenarioBaselineId:
        runtime.createId(
          "dt_scenario_baseline"
        ),
      scenarioHandoffId,
      scenarioId:
        scenario.data.scenarioId,
      historicalSnapshotId:
        handoff.data.historicalSnapshotId,
      historicalSnapshotVersion:
        handoff.data.version,
      historicalSnapshotChecksum:
        handoff.data.checksum,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      baselineState:
        baselineState.map(runtime.clone),
      effectiveState:
        effectiveState.map(runtime.clone),
      conditions:
        conditions.map(runtime.clone),
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
      scenarioChecksum:
        global.INFINICUS.DT
          .scenarioChecksum
          .hash({
            scenario:
              scenario.data,
            baselineState,
            conditions
          }),
      status: "validated",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .scenarioStore
      .put(
        "baselines",
        scenarioBaseline
      );

    const simulationHandoff = {
      simulationHandoffId:
        runtime.createId(
          "dt_simulation_handoff"
        ),
      targetBlock: "DT-24",
      scenarioBaselineId:
        scenarioBaseline.scenarioBaselineId,
      scenarioId:
        scenarioBaseline.scenarioId,
      historicalSnapshotId:
        scenarioBaseline.historicalSnapshotId,
      historicalSnapshotVersion:
        scenarioBaseline.historicalSnapshotVersion,
      historicalSnapshotChecksum:
        scenarioBaseline.historicalSnapshotChecksum,
      scenarioChecksum:
        scenarioBaseline.scenarioChecksum,
      businessId:
        scenarioBaseline.businessId,
      twinId:
        scenarioBaseline.twinId,
      scenario:
        runtime.clone(scenario.data),
      actualBaselineState:
        baselineState.map(runtime.clone),
      effectiveScenarioState:
        effectiveState.map(runtime.clone),
      initialConditions:
        conditions.map(runtime.clone),
      businessEvents:
        scenarioBaseline.businessEvents.map(runtime.clone),
      opportunities:
        scenarioBaseline.opportunities.map(runtime.clone),
      vulnerabilities:
        scenarioBaseline.vulnerabilities.map(runtime.clone),
      breaches:
        scenarioBaseline.breaches.map(runtime.clone),
      readiness:
        runtime.clone(scenarioBaseline.readiness),
      integrityValidation:
        runtime.clone(
          scenarioBaseline.integrityValidation
        ),
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .scenarioStore
      .put(
        "simulation_handoffs",
        simulationHandoff
      );

    await runtime.emit(
      "dt.scenario_baseline.completed",
      {
        scenarioBaseline,
        simulationHandoffId:
          simulationHandoff.simulationHandoffId
      }
    );

    return runtime.success({
      scenario:
        scenario.data,
      scenarioBaseline,
      simulationHandoff
    });
  }

  const api = Object.freeze({
    createScenario,
    getScenario: ({
      scenarioId
    }) =>
      global.INFINICUS.DT
        .scenarioStore
        .get(
          "scenarios",
          scenarioId
        ),
    getScenarioBaseline: ({
      scenarioBaselineId
    }) =>
      global.INFINICUS.DT
        .scenarioStore
        .get(
          "baselines",
          scenarioBaselineId
        ),
    getSimulationHandoff: ({
      simulationHandoffId
    }) =>
      global.INFINICUS.DT
        .scenarioStore
        .get(
          "simulation_handoffs",
          simulationHandoffId
        ),
    listScenarios: () =>
      global.INFINICUS.DT
        .scenarioStore
        .list("scenarios")
  });

  runtime.registerService(
    "dt.scenario_baseline",
    api,
    { block: "DT-23" }
  );

  runtime.registerRoute(
    "dt.scenario.create",
    createScenario
  );

  global.INFINICUS.DT
    .scenarioBaselineEngine = api;
})(window);
