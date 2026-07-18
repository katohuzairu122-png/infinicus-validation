(function (global) {
  "use strict";

  function analyze({
    assets = [],
    states = [],
    dependencies = []
  } = {}) {
    const stateByAsset =
      new Map();

    for (const state of states) {
      stateByAsset.set(
        state.assetId,
        state
      );
    }

    const average = field => {
      const values =
        states
          .map(state =>
            Number(state[field])
          )
          .filter(Number.isFinite);

      return values.length
        ? Number(
            (
              values.reduce(
                (a, b) => a + b,
                0
              ) / values.length
            ).toFixed(4)
          )
        : null;
    };

    const criticalAssets =
      assets.filter(asset =>
        ["high", "critical"]
          .includes(asset.criticality)
      );

    const maintenanceDue =
      states.filter(state =>
        state.maintenanceDue
      );

    const degradedAssets =
      assets
        .filter(asset => {
          const state =
            stateByAsset.get(asset.assetId);

          return state &&
            (
              state.conditionScore < 60 ||
              state.availabilityPercent < 80
            );
        })
        .map(asset => ({
          assetId:
            asset.assetId,
          name:
            asset.name,
          state:
            structuredClone(
              stateByAsset.get(asset.assetId)
            )
        }));

    const singlePointsOfFailure =
      dependencies
        .filter(dependency =>
          dependency.critical &&
          dependency.redundancyAssetIds.length === 0
        )
        .map(structuredClone);

    const totalAcquisitionValue =
      assets.reduce(
        (sum, asset) =>
          sum +
          Number(
            asset.acquisitionValue || 0
          ),
        0
      );

    return {
      assetCount:
        assets.length,
      criticalAssetCount:
        criticalAssets.length,
      maintenanceDueCount:
        maintenanceDue.length,
      averageConditionScore:
        average("conditionScore"),
      averageAvailabilityPercent:
        average("availabilityPercent"),
      averageUtilizationPercent:
        average("utilizationPercent"),
      totalDowntimeHours:
        Number(
          states.reduce(
            (sum, state) =>
              sum +
              Number(
                state.downtimeHours || 0
              ),
            0
          ).toFixed(4)
        ),
      totalFailureCount:
        states.reduce(
          (sum, state) =>
            sum +
            Number(
              state.failureCount || 0
            ),
          0
        ),
      totalAcquisitionValue:
        Number(
          totalAcquisitionValue.toFixed(4)
        ),
      degradedAssets,
      singlePointsOfFailure
    };
  }

  global.INFINICUS.DT.assetAnalyzer =
    Object.freeze({ analyze });
})(window);
