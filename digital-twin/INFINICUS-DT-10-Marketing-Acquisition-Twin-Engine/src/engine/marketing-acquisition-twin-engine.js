(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function buildMarketingAcquisitionState({
    marketingHandoffId,
    channelInputs = [],
    audienceInputs = [],
    campaignInputs = [],
    stateInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .salesRevenueFlowTwinEngine
        .getMarketingHandoff({
          marketingHandoffId
        });

    if (!handoff.ok) return handoff;

    const channels = [];

    for (const input of channelInputs) {
      const built =
        global.INFINICUS.DT
          .marketingChannelModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      channels.push(built.data);

      await global.INFINICUS.DT
        .marketingStateStore
        .put("channels", built.data);
    }

    const audiences = [];

    for (const input of audienceInputs) {
      const built =
        global.INFINICUS.DT
          .audienceCampaignModel
          .createAudience({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      audiences.push(built.data);

      await global.INFINICUS.DT
        .marketingStateStore
        .put("audiences", built.data);
    }

    const campaigns = [];

    for (const input of campaignInputs) {
      const built =
        global.INFINICUS.DT
          .audienceCampaignModel
          .createCampaign({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      campaigns.push(built.data);
    }

    const states = [];

    for (const input of stateInputs) {
      const built =
        global.INFINICUS.DT
          .campaignStateModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      states.push(built.data);
    }

    const validation =
      global.INFINICUS.DT
        .marketingStateValidator
        .validate({
          channels,
          audiences,
          campaigns,
          states,
          customerSegments:
            handoff.data.customerSegments
        });

    if (!validation.valid) {
      return runtime.failure(
        "MARKETING_ACQUISITION_STATE_INVALID",
        "Marketing and acquisition validation failed.",
        validation
      );
    }

    for (const campaign of campaigns) {
      await global.INFINICUS.DT
        .marketingStateStore
        .put("campaigns", campaign);
    }

    for (const state of states) {
      await global.INFINICUS.DT
        .marketingStateStore
        .put("states", state);
    }

    const analysis =
      global.INFINICUS.DT
        .marketingStateAnalyzer
        .analyze(states);

    const snapshot = {
      marketingSnapshotId:
        runtime.createId("dt_marketing_snapshot"),
      marketingHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      channels:
        channels.map(runtime.clone),
      audiences:
        audiences.map(runtime.clone),
      campaigns:
        campaigns.map(runtime.clone),
      states:
        states.map(runtime.clone),
      analysis:
        runtime.clone(analysis),
      salesAnalysis:
        runtime.clone(handoff.data.salesAnalysis),
      status: "current",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .marketingStateStore
      .put("snapshots", snapshot);

    const operationsHandoff = {
      operationsHandoffId:
        runtime.createId("dt_operations_handoff"),
      targetBlock: "DT-11",
      marketingSnapshotId:
        snapshot.marketingSnapshotId,
      salesRevenueSnapshotId:
        handoff.data.salesRevenueSnapshotId,
      customerDemandSnapshotId:
        handoff.data.customerDemandSnapshotId,
      financialSnapshotId:
        handoff.data.financialSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      marketingAnalysis:
        runtime.clone(analysis),
      channels:
        channels.map(runtime.clone),
      audiences:
        audiences.map(runtime.clone),
      campaigns:
        campaigns.map(runtime.clone),
      campaignStates:
        states.map(runtime.clone),
      salesAnalysis:
        runtime.clone(handoff.data.salesAnalysis),
      customerProfiles:
        handoff.data.customerProfiles.map(runtime.clone),
      customerSegments:
        handoff.data.customerSegments.map(runtime.clone),
      orders:
        handoff.data.orders.map(runtime.clone),
      revenueStreams:
        handoff.data.revenueStreams.map(runtime.clone),
      financialProfile:
        runtime.clone(handoff.data.financialProfile),
      sourceContext:
        runtime.clone(handoff.data.sourceContext),
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .marketingStateStore
      .put(
        "operations_handoffs",
        operationsHandoff
      );

    await runtime.emit(
      "dt.marketing_acquisition.completed",
      {
        marketingSnapshot:
          snapshot,
        operationsHandoffId:
          operationsHandoff.operationsHandoffId
      }
    );

    return runtime.success({
      marketingSnapshot:
        snapshot,
      operationsHandoff
    });
  }

  const api = Object.freeze({
    buildMarketingAcquisitionState,
    getMarketingSnapshot: ({ marketingSnapshotId }) =>
      global.INFINICUS.DT
        .marketingStateStore
        .get(
          "snapshots",
          marketingSnapshotId
        ),
    getOperationsHandoff: ({ operationsHandoffId }) =>
      global.INFINICUS.DT
        .marketingStateStore
        .get(
          "operations_handoffs",
          operationsHandoffId
        ),
    listTwinChannels: ({ twinId }) =>
      global.INFINICUS.DT
        .marketingStateStore
        .listByTwin("channels", twinId),
    listTwinCampaigns: ({ twinId }) =>
      global.INFINICUS.DT
        .marketingStateStore
        .listByTwin("campaigns", twinId),
    listTwinCampaignStates: ({ twinId }) =>
      global.INFINICUS.DT
        .marketingStateStore
        .listByTwin("states", twinId)
  });

  runtime.registerService(
    "dt.marketing_acquisition_twin",
    api,
    { block: "DT-10" }
  );

  runtime.registerRoute(
    "dt.marketing_acquisition.build",
    buildMarketingAcquisitionState
  );

  global.INFINICUS.DT.marketingAcquisitionTwinEngine = api;
})(window);
