(function (global) {
  "use strict";

  function createState(input = {}) {
    const runtime =
      global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.assetId ||
      !input.period
    ) {
      return runtime.failure(
        "ASSET_STATE_INVALID",
        "twinId, assetId, and period are required."
      );
    }

    return runtime.success({
      assetStateId:
        input.assetStateId ||
        runtime.createId("dt_asset_state"),
      twinId:
        String(input.twinId),
      assetId:
        String(input.assetId),
      period:
        String(input.period),
      conditionScore:
        Number(input.conditionScore ?? 100),
      availabilityPercent:
        Number(input.availabilityPercent ?? 100),
      utilizationPercent:
        Number(input.utilizationPercent || 0),
      downtimeHours:
        Number(input.downtimeHours || 0),
      maintenanceDue:
        Boolean(input.maintenanceDue),
      lastMaintainedAt:
        input.lastMaintainedAt || null,
      nextMaintenanceAt:
        input.nextMaintenanceAt || null,
      failureCount:
        Number(input.failureCount || 0),
      sourceType:
        String(input.sourceType || "observed"),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      createdAt:
        new Date().toISOString()
    });
  }

  function createDependency(input = {}) {
    const runtime =
      global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.sourceAssetId ||
      !input.targetAssetId
    ) {
      return runtime.failure(
        "ASSET_DEPENDENCY_INVALID",
        "twinId, sourceAssetId, and targetAssetId are required."
      );
    }

    return runtime.success({
      assetDependencyId:
        input.assetDependencyId ||
        runtime.createId("dt_asset_dependency"),
      twinId:
        String(input.twinId),
      sourceAssetId:
        String(input.sourceAssetId),
      targetAssetId:
        String(input.targetAssetId),
      dependencyType:
        String(input.dependencyType || "requires"),
      critical:
        Boolean(input.critical),
      redundancyAssetIds:
        Array.isArray(input.redundancyAssetIds)
          ? input.redundancyAssetIds.map(String)
          : [],
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT
    .assetStateDependencyModel =
      Object.freeze({
        createState,
        createDependency
      });
})(window);
