(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  async function buildAssetInfrastructureState({
    assetHandoffId,
    facilityInputs = [],
    assetInputs = [],
    stateInputs = [],
    dependencyInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .workforceCapabilityTwinEngine
        .getAssetHandoff({
          assetHandoffId
        });

    if (!handoff.ok) return handoff;

    const facilities = [];

    for (const input of facilityInputs) {
      const built =
        global.INFINICUS.DT
          .facilityModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      facilities.push(built.data);

      await global.INFINICUS.DT
        .assetStore
        .put(
          "facilities",
          built.data
        );
    }

    const assets = [];

    for (const input of assetInputs) {
      const built =
        global.INFINICUS.DT
          .assetModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      assets.push(built.data);
    }

    const states = [];

    for (const input of stateInputs) {
      const built =
        global.INFINICUS.DT
          .assetStateDependencyModel
          .createState({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      states.push(built.data);
    }

    const dependencies = [];

    for (const input of dependencyInputs) {
      const built =
        global.INFINICUS.DT
          .assetStateDependencyModel
          .createDependency({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      dependencies.push(built.data);
    }

    const validation =
      global.INFINICUS.DT
        .assetValidator
        .validate({
          assets,
          facilities,
          states,
          dependencies,
          workforceMembers:
            handoff.data.workforceMembers
        });

    if (!validation.valid) {
      return runtime.failure(
        "ASSET_INFRASTRUCTURE_STATE_INVALID",
        "Asset and infrastructure validation failed.",
        validation
      );
    }

    for (const asset of assets) {
      await global.INFINICUS.DT
        .assetStore
        .put("assets", asset);
    }

    for (const state of states) {
      await global.INFINICUS.DT
        .assetStore
        .put("states", state);
    }

    for (
      const dependency
      of dependencies
    ) {
      await global.INFINICUS.DT
        .assetStore
        .put(
          "dependencies",
          dependency
        );
    }

    const analysis =
      global.INFINICUS.DT
        .assetAnalyzer
        .analyze({
          assets,
          states,
          dependencies
        });

    const snapshot = {
      assetSnapshotId:
        runtime.createId(
          "dt_asset_snapshot"
        ),
      assetHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      facilities:
        facilities.map(runtime.clone),
      assets:
        assets.map(runtime.clone),
      states:
        states.map(runtime.clone),
      dependencies:
        dependencies.map(runtime.clone),
      analysis:
        runtime.clone(analysis),
      workforceAnalysis:
        runtime.clone(
          handoff.data.workforceAnalysis
        ),
      status: "current",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .assetStore
      .put("snapshots", snapshot);

    const marketHandoff = {
      marketHandoffId:
        runtime.createId("dt_market_handoff"),
      targetBlock: "DT-15",
      assetSnapshotId:
        snapshot.assetSnapshotId,
      workforceSnapshotId:
        handoff.data.workforceSnapshotId,
      inventorySupplySnapshotId:
        handoff.data.inventorySupplySnapshotId,
      operationsSnapshotId:
        handoff.data.operationsSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      assetAnalysis:
        runtime.clone(analysis),
      facilities:
        facilities.map(runtime.clone),
      assets:
        assets.map(runtime.clone),
      assetStates:
        states.map(runtime.clone),
      assetDependencies:
        dependencies.map(runtime.clone),
      workforceAnalysis:
        runtime.clone(
          handoff.data.workforceAnalysis
        ),
      workforceMembers:
        handoff.data.workforceMembers
          .map(runtime.clone),
      products:
        handoff.data.products
          .map(runtime.clone),
      locations:
        handoff.data.locations
          .map(runtime.clone),
      suppliers:
        handoff.data.suppliers
          .map(runtime.clone),
      processes:
        handoff.data.processes
          .map(runtime.clone),
      resources:
        handoff.data.resources
          .map(runtime.clone),
      sourceContext:
        runtime.clone(
          handoff.data.sourceContext
        ),
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .assetStore
      .put(
        "market_handoffs",
        marketHandoff
      );

    await runtime.emit(
      "dt.asset_infrastructure.completed",
      {
        assetSnapshot:
          snapshot,
        marketHandoffId:
          marketHandoff.marketHandoffId
      }
    );

    return runtime.success({
      assetSnapshot:
        snapshot,
      marketHandoff
    });
  }

  const api = Object.freeze({
    buildAssetInfrastructureState,
    getAssetSnapshot: ({
      assetSnapshotId
    }) =>
      global.INFINICUS.DT
        .assetStore
        .get(
          "snapshots",
          assetSnapshotId
        ),
    getMarketHandoff: ({
      marketHandoffId
    }) =>
      global.INFINICUS.DT
        .assetStore
        .get(
          "market_handoffs",
          marketHandoffId
        ),
    listTwinAssets: ({ twinId }) =>
      global.INFINICUS.DT
        .assetStore
        .listByTwin(
          "assets",
          twinId
        ),
    listTwinFacilities: ({ twinId }) =>
      global.INFINICUS.DT
        .assetStore
        .listByTwin(
          "facilities",
          twinId
        ),
    listTwinAssetStates: ({ twinId }) =>
      global.INFINICUS.DT
        .assetStore
        .listByTwin(
          "states",
          twinId
        )
  });

  runtime.registerService(
    "dt.asset_infrastructure_twin",
    api,
    { block: "DT-14" }
  );

  runtime.registerRoute(
    "dt.asset_infrastructure.build",
    buildAssetInfrastructureState
  );

  global.INFINICUS.DT
    .assetInfrastructureTwinEngine = api;
})(window);
