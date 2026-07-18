(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  async function buildMarketCompetitiveState({
    marketHandoffId,
    marketInputs = [],
    segmentInputs = [],
    competitorInputs = [],
    stateInputs = [],
    externalForceInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .assetInfrastructureTwinEngine
        .getMarketHandoff({
          marketHandoffId
        });

    if (!handoff.ok) return handoff;

    const markets = [];

    for (const input of marketInputs) {
      const built =
        global.INFINICUS.DT
          .marketSegmentModel
          .createMarket({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      markets.push(built.data);

      await global.INFINICUS.DT
        .marketStore
        .put("markets", built.data);
    }

    const segments = [];

    for (const input of segmentInputs) {
      const built =
        global.INFINICUS.DT
          .marketSegmentModel
          .createSegment({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      segments.push(built.data);
    }

    const competitors = [];

    for (const input of competitorInputs) {
      const built =
        global.INFINICUS.DT
          .competitorModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      competitors.push(built.data);
    }

    const states = [];

    for (const input of stateInputs) {
      const built =
        global.INFINICUS.DT
          .marketStateModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      states.push(built.data);
    }

    const externalForces = [];

    for (const input of externalForceInputs) {
      const built =
        global.INFINICUS.DT
          .externalForceModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      externalForces.push(built.data);
    }

    const validation =
      global.INFINICUS.DT
        .marketValidator
        .validate({
          markets,
          segments,
          competitors,
          states,
          externalForces
        });

    if (!validation.valid) {
      return runtime.failure(
        "MARKET_COMPETITIVE_STATE_INVALID",
        "Market and competitive validation failed.",
        validation
      );
    }

    for (const item of segments) {
      await global.INFINICUS.DT
        .marketStore
        .put("segments", item);
    }

    for (const item of competitors) {
      await global.INFINICUS.DT
        .marketStore
        .put("competitors", item);
    }

    for (const item of states) {
      await global.INFINICUS.DT
        .marketStore
        .put("states", item);
    }

    for (const item of externalForces) {
      await global.INFINICUS.DT
        .marketStore
        .put("external_forces", item);
    }

    const analysis =
      global.INFINICUS.DT
        .marketAnalyzer
        .analyze({
          markets,
          segments,
          competitors,
          states,
          externalForces
        });

    const snapshot = {
      marketSnapshotId:
        runtime.createId(
          "dt_market_snapshot"
        ),
      marketHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      markets:
        markets.map(runtime.clone),
      segments:
        segments.map(runtime.clone),
      competitors:
        competitors.map(runtime.clone),
      states:
        states.map(runtime.clone),
      externalForces:
        externalForces.map(runtime.clone),
      analysis:
        runtime.clone(analysis),
      assetAnalysis:
        runtime.clone(
          handoff.data.assetAnalysis
        ),
      status: "current",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .marketStore
      .put("snapshots", snapshot);

    const syncHandoff = {
      syncHandoffId:
        runtime.createId("dt_sync_handoff"),
      targetBlock: "DT-16",
      marketSnapshotId:
        snapshot.marketSnapshotId,
      assetSnapshotId:
        handoff.data.assetSnapshotId,
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
      marketState:
        runtime.clone(snapshot),
      assetState: {
        analysis:
          runtime.clone(
            handoff.data.assetAnalysis
          ),
        facilities:
          handoff.data.facilities
            .map(runtime.clone),
        assets:
          handoff.data.assets
            .map(runtime.clone),
        states:
          handoff.data.assetStates
            .map(runtime.clone),
        dependencies:
          handoff.data.assetDependencies
            .map(runtime.clone)
      },
      workforceState: {
        analysis:
          runtime.clone(
            handoff.data.workforceAnalysis
          ),
        members:
          handoff.data.workforceMembers
            .map(runtime.clone)
      },
      inventoryContext: {
        products:
          handoff.data.products
            .map(runtime.clone),
        locations:
          handoff.data.locations
            .map(runtime.clone),
        suppliers:
          handoff.data.suppliers
            .map(runtime.clone)
      },
      operationsContext: {
        processes:
          handoff.data.processes
            .map(runtime.clone),
        resources:
          handoff.data.resources
            .map(runtime.clone)
      },
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
      .marketStore
      .put(
        "sync_handoffs",
        syncHandoff
      );

    await runtime.emit(
      "dt.market_competitive.completed",
      {
        marketSnapshot:
          snapshot,
        syncHandoffId:
          syncHandoff.syncHandoffId
      }
    );

    return runtime.success({
      marketSnapshot:
        snapshot,
      syncHandoff
    });
  }

  const api = Object.freeze({
    buildMarketCompetitiveState,
    getMarketSnapshot: ({
      marketSnapshotId
    }) =>
      global.INFINICUS.DT
        .marketStore
        .get(
          "snapshots",
          marketSnapshotId
        ),
    getSyncHandoff: ({
      syncHandoffId
    }) =>
      global.INFINICUS.DT
        .marketStore
        .get(
          "sync_handoffs",
          syncHandoffId
        ),
    listTwinMarkets: ({ twinId }) =>
      global.INFINICUS.DT
        .marketStore
        .listByTwin(
          "markets",
          twinId
        ),
    listTwinCompetitors: ({ twinId }) =>
      global.INFINICUS.DT
        .marketStore
        .listByTwin(
          "competitors",
          twinId
        ),
    listTwinMarketStates: ({ twinId }) =>
      global.INFINICUS.DT
        .marketStore
        .listByTwin(
          "states",
          twinId
        )
  });

  runtime.registerService(
    "dt.market_competitive_twin",
    api,
    { block: "DT-15" }
  );

  runtime.registerRoute(
    "dt.market_competitive.build",
    buildMarketCompetitiveState
  );

  global.INFINICUS.DT
    .marketCompetitiveTwinEngine = api;
})(window);
