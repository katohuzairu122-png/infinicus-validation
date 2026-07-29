(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  async function buildStrategicPosition({
    opportunityHandoffId,
    capabilityInputs = [],
    opportunityInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .riskVulnerabilityStateEngine
        .getOpportunityHandoff({
          opportunityHandoffId
        });

    if (!handoff.ok) return handoff;

    const capabilities = [];

    for (
      const input
      of capabilityInputs
    ) {
      const built =
        global.INFINICUS.DT
          .strategicCapabilityModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      capabilities.push(
        built.data
      );

      await global.INFINICUS.DT
        .opportunityStore
        .put(
          "capabilities",
          built.data
        );
    }

    const opportunities = [];

    for (
      const input
      of opportunityInputs
    ) {
      const built =
        global.INFINICUS.DT
          .strategicOpportunityModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId,
            businessId:
              handoff.data.businessId
          });

      if (!built.ok) return built;

      opportunities.push(
        built.data
      );
    }

    const validation =
      global.INFINICUS.DT
        .opportunityValidator
        .validate({
          opportunities,
          capabilities,
          synchronizedState:
            handoff.data.synchronizedState
        });

    if (!validation.valid) {
      return runtime.failure(
        "OPPORTUNITY_STRATEGIC_STATE_INVALID",
        "Opportunity and strategic-position validation failed.",
        validation
      );
    }

    for (
      const opportunity
      of opportunities
    ) {
      await global.INFINICUS.DT
        .opportunityStore
        .put(
          "opportunities",
          opportunity
        );
    }

    const analysis =
      global.INFINICUS.DT
        .opportunityPortfolioAnalyzer
        .analyze(
          opportunities,
          capabilities
        );

    const snapshot = {
      strategicPositionSnapshotId:
        runtime.createId(
          "dt_strategic_position_snapshot"
        ),
      opportunityHandoffId,
      riskSnapshotId:
        handoff.data.riskSnapshotId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      capabilities:
        capabilities.map(
          runtime.clone
        ),
      opportunities:
        opportunities.map(
          runtime.clone
        ),
      analysis:
        runtime.clone(analysis),
      riskAnalysis:
        runtime.clone(
          handoff.data.riskAnalysis
        ),
      status:
        analysis.priorityCount > 0
          ? "opportunity_ready"
          : "current",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .opportunityStore
      .put("snapshots", snapshot);

    const integrityHandoff = {
      integrityHandoffId:
        runtime.createId(
          "dt_integrity_handoff"
        ),
      targetBlock: "DT-21",
      strategicPositionSnapshotId:
        snapshot
          .strategicPositionSnapshotId,
      riskSnapshotId:
        handoff.data.riskSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      strategicCapabilities:
        capabilities.map(
          runtime.clone
        ),
      opportunities:
        analysis.enriched.map(
          runtime.clone
        ),
      opportunityAnalysis:
        runtime.clone(analysis),
      riskAnalysis:
        runtime.clone(
          handoff.data.riskAnalysis
        ),
      vulnerabilities:
        handoff.data.vulnerabilities
          .map(runtime.clone),
      synchronizedState:
        handoff.data.synchronizedState
          .map(runtime.clone),
      businessEvents:
        handoff.data.businessEvents
          .map(runtime.clone),
      breaches:
        handoff.data.breaches
          .map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .opportunityStore
      .put(
        "integrity_handoffs",
        integrityHandoff
      );

    await runtime.emit(
      "dt.strategic_position.completed",
      {
        strategicPositionSnapshot:
          snapshot,
        integrityHandoffId:
          integrityHandoff
            .integrityHandoffId
      }
    );

    return runtime.success({
      strategicPositionSnapshot:
        snapshot,
      integrityHandoff
    });
  }

  const api = Object.freeze({
    buildStrategicPosition,
    getStrategicPositionSnapshot: ({
      strategicPositionSnapshotId
    }) =>
      global.INFINICUS.DT
        .opportunityStore
        .get(
          "snapshots",
          strategicPositionSnapshotId
        ),
    getIntegrityHandoff: ({
      integrityHandoffId
    }) =>
      global.INFINICUS.DT
        .opportunityStore
        .get(
          "integrity_handoffs",
          integrityHandoffId
        ),
    listTwinCapabilities: ({
      twinId
    }) =>
      global.INFINICUS.DT
        .opportunityStore
        .listByTwin(
          "capabilities",
          twinId
        ),
    listTwinOpportunities: ({
      twinId
    }) =>
      global.INFINICUS.DT
        .opportunityStore
        .listByTwin(
          "opportunities",
          twinId
        )
  });

  runtime.registerService(
    "dt.opportunity_strategic_position",
    api,
    { block: "DT-20" }
  );

  runtime.registerRoute(
    "dt.strategic_position.build",
    buildStrategicPosition
  );

  global.INFINICUS.DT
    .opportunityStrategicPositionEngine =
      api;
})(window);
