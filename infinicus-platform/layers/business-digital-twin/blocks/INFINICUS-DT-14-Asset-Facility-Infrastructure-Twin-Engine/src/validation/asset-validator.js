(function (global) {
  "use strict";

  function validate({
    assets = [],
    facilities = [],
    states = [],
    dependencies = [],
    workforceMembers = []
  } = {}) {
    const issues = [];

    const assetIds =
      new Set(
        assets.map(item => item.assetId)
      );

    const facilityIds =
      new Set(
        facilities.map(
          item => item.facilityId
        )
      );

    const workforceIds =
      new Set(
        workforceMembers.map(
          item =>
            item.workforceMemberId
        )
      );

    for (const asset of assets) {
      if (
        asset.facilityId &&
        !facilityIds.has(
          asset.facilityId
        )
      ) {
        issues.push(
          `Unknown facility: ${asset.facilityId}`
        );
      }

      if (
        asset.assignedWorkforceMemberId &&
        !workforceIds.has(
          asset.assignedWorkforceMemberId
        )
      ) {
        issues.push(
          `Unknown assigned workforce member: ${asset.assignedWorkforceMemberId}`
        );
      }
    }

    for (const state of states) {
      if (!assetIds.has(state.assetId)) {
        issues.push(
          `Unknown asset state reference: ${state.assetId}`
        );
      }

      if (
        state.confidence < 0 ||
        state.confidence > 1
      ) {
        issues.push(
          "Asset-state confidence must be between 0 and 1."
        );
      }
    }

    for (const dependency of dependencies) {
      if (
        !assetIds.has(
          dependency.sourceAssetId
        )
      ) {
        issues.push(
          `Unknown dependency source: ${dependency.sourceAssetId}`
        );
      }

      if (
        !assetIds.has(
          dependency.targetAssetId
        )
      ) {
        issues.push(
          `Unknown dependency target: ${dependency.targetAssetId}`
        );
      }

      if (
        dependency.sourceAssetId ===
        dependency.targetAssetId
      ) {
        issues.push(
          "An asset cannot depend on itself."
        );
      }

      for (
        const redundancyAssetId
        of dependency.redundancyAssetIds
      ) {
        if (
          !assetIds.has(
            redundancyAssetId
          )
        ) {
          issues.push(
            `Unknown redundancy asset: ${redundancyAssetId}`
          );
        }
      }
    }

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.assetValidator =
    Object.freeze({ validate });
})(window);
