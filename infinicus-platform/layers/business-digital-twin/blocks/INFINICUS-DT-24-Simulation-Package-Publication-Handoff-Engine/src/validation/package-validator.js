(function (global) {
  "use strict";

  function validate({
    handoff,
    policy
  }) {
    const issues = [];

    if (
      policy.requireHistoricalChecksum &&
      !handoff.historicalSnapshotChecksum
    ) {
      issues.push(
        "Historical snapshot checksum is required."
      );
    }

    if (
      policy.requireScenarioChecksum &&
      !handoff.scenarioChecksum
    ) {
      issues.push(
        "Scenario checksum is required."
      );
    }

    if (
      policy.requireReadiness &&
      handoff.readiness?.ready !== true
    ) {
      issues.push(
        "Twin readiness validation did not pass."
      );
    }

    if (
      !Array.isArray(
        handoff.actualBaselineState
      ) ||
      handoff.actualBaselineState.length <
        policy.minimumBaselineStateCount
    ) {
      issues.push(
        "Actual baseline state is incomplete."
      );
    }

    const contaminatedActual =
      handoff.actualBaselineState.filter(
        item =>
          item.sourceClass !== "actual"
      );

    if (contaminatedActual.length) {
      issues.push(
        "Actual baseline contains non-actual state."
      );
    }

    const invalidConditions =
      handoff.initialConditions.filter(
        item =>
          !policy.allowedConditionTypes
            .includes(item.conditionType)
      );

    if (invalidConditions.length) {
      issues.push(
        "One or more initial conditions use unsupported types."
      );
    }

    const unlabelledEffectiveState =
      handoff.effectiveScenarioState.filter(
        item =>
          ![
            "actual",
            "assumed",
            "simulated"
          ].includes(item.sourceClass)
      );

    if (unlabelledEffectiveState.length) {
      issues.push(
        "Effective scenario state contains unclassified state."
      );
    }

    return {
      valid:
        issues.length === 0,
      issues,
      actualStateCount:
        handoff.actualBaselineState.length,
      effectiveStateCount:
        handoff.effectiveScenarioState.length,
      conditionCount:
        handoff.initialConditions.length
    };
  }

  global.INFINICUS.DT.simulationPackageValidator =
    Object.freeze({ validate });
})(window);
