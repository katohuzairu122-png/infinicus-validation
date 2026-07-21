(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function publishSnapshot({
    historyHandoffId,
    retentionClass = "standard"
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .twinIntegrityConfidenceEngine
        .getHistoryHandoff({
          historyHandoffId
        });

    if (!handoff.ok) return handoff;

    if (handoff.data.status !== "ready") {
      return runtime.failure(
        "TWIN_NOT_READY_FOR_HISTORY",
        "Twin failed DT-21 readiness validation.",
        {
          readiness:
            handoff.data.readiness,
          integrityValidation:
            handoff.data.integrityValidation
        }
      );
    }

    const prior =
      await global.INFINICUS.DT
        .historyStore
        .listTwinSnapshots(
          handoff.data.twinId
        );

    if (!prior.ok) return prior;

    const version =
      prior.data.length + 1;

    const timeline =
      global.INFINICUS.DT
        .timelineBuilder
        .build({
          synchronizedState:
            handoff.data.synchronizedState,
          businessEvents:
            handoff.data.businessEvents,
          opportunities:
            handoff.data.opportunities,
          vulnerabilities:
            handoff.data.vulnerabilities,
          breaches:
            handoff.data.breaches
        });

    const snapshotBody = {
      version,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      state:
        handoff.data.synchronizedState.map(runtime.clone),
      businessEvents:
        handoff.data.businessEvents.map(runtime.clone),
      opportunities:
        handoff.data.opportunities.map(runtime.clone),
      vulnerabilities:
        handoff.data.vulnerabilities.map(runtime.clone),
      breaches:
        handoff.data.breaches.map(runtime.clone),
      integrityValidation:
        runtime.clone(handoff.data.integrityValidation),
      readiness:
        runtime.clone(handoff.data.readiness),
      timeline:
        timeline.map(runtime.clone)
    };

    const snapshot = Object.freeze({
      historicalSnapshotId:
        runtime.createId("dt_historical_snapshot"),
      historyHandoffId,
      integritySnapshotId:
        handoff.data.integritySnapshotId,
      strategicPositionSnapshotId:
        handoff.data.strategicPositionSnapshotId,
      riskSnapshotId:
        handoff.data.riskSnapshotId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      twinVersionKey:
        `${handoff.data.twinId}|${version}`,
      version,
      checksum:
        global.INFINICUS.DT
          .snapshotChecksum
          .hash(snapshotBody),
      retentionClass:
        String(retentionClass),
      previousSnapshotId:
        prior.data.at(-1)
          ?.historicalSnapshotId || null,
      state:
        snapshotBody.state,
      businessEvents:
        snapshotBody.businessEvents,
      opportunities:
        snapshotBody.opportunities,
      vulnerabilities:
        snapshotBody.vulnerabilities,
      breaches:
        snapshotBody.breaches,
      integrityValidation:
        snapshotBody.integrityValidation,
      readiness:
        snapshotBody.readiness,
      timeline:
        snapshotBody.timeline,
      correlationId:
        handoff.data.correlationId,
      status: "published",
      publishedAt:
        new Date().toISOString()
    });

    await global.INFINICUS.DT
      .historyStore
      .put("snapshots", snapshot);

    for (const entry of timeline) {
      await global.INFINICUS.DT
        .historyStore
        .put("timeline_entries", {
          ...entry,
          historicalSnapshotId:
            snapshot.historicalSnapshotId,
          twinId:
            snapshot.twinId,
          version:
            snapshot.version
        });
    }

    const comparison =
      prior.data.length
        ? global.INFINICUS.DT
            .snapshotComparator
            .compare(
              prior.data.at(-1),
              snapshot
            )
        : {
            added:
              snapshot.state.map(runtime.clone),
            removed: [],
            changed: [],
            unchanged: [],
            addedCount:
              snapshot.state.length,
            removedCount: 0,
            changedCount: 0,
            unchangedCount: 0
          };

    const scenarioHandoff = {
      scenarioHandoffId:
        runtime.createId("dt_scenario_handoff"),
      targetBlock: "DT-23",
      historicalSnapshotId:
        snapshot.historicalSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      version:
        snapshot.version,
      checksum:
        snapshot.checksum,
      baselineState:
        snapshot.state.map(runtime.clone),
      businessEvents:
        snapshot.businessEvents.map(runtime.clone),
      opportunities:
        snapshot.opportunities.map(runtime.clone),
      vulnerabilities:
        snapshot.vulnerabilities.map(runtime.clone),
      breaches:
        snapshot.breaches.map(runtime.clone),
      readiness:
        runtime.clone(snapshot.readiness),
      integrityValidation:
        runtime.clone(snapshot.integrityValidation),
      snapshotDelta:
        runtime.clone(comparison),
      correlationId:
        snapshot.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .historyStore
      .put("scenario_handoffs", scenarioHandoff);

    await runtime.emit(
      "dt.historical_snapshot.published",
      {
        historicalSnapshot: snapshot,
        scenarioHandoffId:
          scenarioHandoff.scenarioHandoffId
      }
    );

    return runtime.success({
      historicalSnapshot: snapshot,
      snapshotDelta: comparison,
      scenarioHandoff
    });
  }

  async function compareSnapshots({
    previousSnapshotId,
    currentSnapshotId
  } = {}) {
    const previous =
      await global.INFINICUS.DT
        .historyStore
        .get("snapshots", previousSnapshotId);

    if (!previous.ok) return previous;

    const current =
      await global.INFINICUS.DT
        .historyStore
        .get("snapshots", currentSnapshotId);

    if (!current.ok) return current;

    return runtime.success(
      global.INFINICUS.DT
        .snapshotComparator
        .compare(
          previous.data,
          current.data
        )
    );
  }

  const api = Object.freeze({
    publishSnapshot,
    compareSnapshots,
    getHistoricalSnapshot: ({ historicalSnapshotId }) =>
      global.INFINICUS.DT
        .historyStore
        .get("snapshots", historicalSnapshotId),
    getScenarioHandoff: ({ scenarioHandoffId }) =>
      global.INFINICUS.DT
        .historyStore
        .get("scenario_handoffs", scenarioHandoffId),
    listTwinSnapshots: ({ twinId }) =>
      global.INFINICUS.DT
        .historyStore
        .listTwinSnapshots(twinId)
  });

  runtime.registerService(
    "dt.historical_snapshot_timeline",
    api,
    { block: "DT-22" }
  );

  runtime.registerRoute(
    "dt.historical_snapshot.publish",
    publishSnapshot
  );

  runtime.registerRoute(
    "dt.historical_snapshot.compare",
    compareSnapshots
  );

  global.INFINICUS.DT
    .historicalSnapshotTimelineEngine = api;
})(window);
