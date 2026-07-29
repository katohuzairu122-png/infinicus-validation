(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function buildSalesRevenueFlow({
    salesHandoffId,
    stageInputs = [],
    opportunityInputs = [],
    orderInputs = [],
    revenueStreamInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .customerDemandTwinEngine
        .getSalesHandoff({
          salesHandoffId
        });

    if (!handoff.ok) return handoff;

    const stages = [];

    for (const input of stageInputs) {
      const built =
        global.INFINICUS.DT
          .pipelineStageModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      stages.push(built.data);

      await global.INFINICUS.DT
        .salesFlowStore
        .put("stages", built.data);
    }

    const opportunities = [];

    for (const input of opportunityInputs) {
      const built =
        global.INFINICUS.DT
          .opportunityModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      opportunities.push(built.data);
    }

    const orders = [];

    for (const input of orderInputs) {
      const built =
        global.INFINICUS.DT
          .orderRevenueModel
          .createOrder({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      orders.push(built.data);
    }

    const validation =
      global.INFINICUS.DT
        .salesFlowValidator
        .validate({
          stages,
          opportunities,
          orders,
          customerProfiles:
            handoff.data.customerProfiles
        });

    if (!validation.valid) {
      return runtime.failure(
        "SALES_REVENUE_FLOW_INVALID",
        "Sales and revenue-flow validation failed.",
        validation
      );
    }

    for (const opportunity of opportunities) {
      await global.INFINICUS.DT
        .salesFlowStore
        .put("opportunities", opportunity);
    }

    for (const order of orders) {
      await global.INFINICUS.DT
        .salesFlowStore
        .put("orders", order);
    }

    const revenueStreams = [];

    for (const input of revenueStreamInputs) {
      const built =
        global.INFINICUS.DT
          .orderRevenueModel
          .createRevenueStream({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      revenueStreams.push(built.data);

      await global.INFINICUS.DT
        .salesFlowStore
        .put("revenue_streams", built.data);
    }

    const analysis =
      global.INFINICUS.DT
        .salesFlowAnalyzer
        .analyze({
          stages,
          opportunities,
          orders
        });

    const snapshot = {
      salesRevenueSnapshotId:
        runtime.createId("dt_sales_revenue_snapshot"),
      salesHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      stages:
        stages.map(runtime.clone),
      opportunities:
        opportunities.map(runtime.clone),
      orders:
        orders.map(runtime.clone),
      revenueStreams:
        revenueStreams.map(runtime.clone),
      analysis:
        runtime.clone(analysis),
      customerDemandAnalysis:
        runtime.clone(
          handoff.data.customerDemandAnalysis
        ),
      status: "current",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .salesFlowStore
      .put("snapshots", snapshot);

    const marketingHandoff = {
      marketingHandoffId:
        runtime.createId("dt_marketing_handoff"),
      targetBlock: "DT-10",
      salesRevenueSnapshotId:
        snapshot.salesRevenueSnapshotId,
      customerDemandSnapshotId:
        handoff.data.customerDemandSnapshotId,
      financialSnapshotId:
        handoff.data.financialSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      salesAnalysis:
        runtime.clone(analysis),
      stages:
        stages.map(runtime.clone),
      opportunities:
        opportunities.map(runtime.clone),
      orders:
        orders.map(runtime.clone),
      revenueStreams:
        revenueStreams.map(runtime.clone),
      customerProfiles:
        handoff.data.customerProfiles.map(runtime.clone),
      customerSegments:
        handoff.data.customerSegments.map(runtime.clone),
      demandStates:
        handoff.data.demandStates.map(runtime.clone),
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
      .salesFlowStore
      .put(
        "marketing_handoffs",
        marketingHandoff
      );

    await runtime.emit(
      "dt.sales_revenue_flow.completed",
      {
        salesRevenueSnapshot:
          snapshot,
        marketingHandoffId:
          marketingHandoff.marketingHandoffId
      }
    );

    return runtime.success({
      salesRevenueSnapshot:
        snapshot,
      marketingHandoff
    });
  }

  const api = Object.freeze({
    buildSalesRevenueFlow,
    getSalesRevenueSnapshot: ({ salesRevenueSnapshotId }) =>
      global.INFINICUS.DT
        .salesFlowStore
        .get(
          "snapshots",
          salesRevenueSnapshotId
        ),
    getMarketingHandoff: ({ marketingHandoffId }) =>
      global.INFINICUS.DT
        .salesFlowStore
        .get(
          "marketing_handoffs",
          marketingHandoffId
        ),
    listTwinOpportunities: ({ twinId }) =>
      global.INFINICUS.DT
        .salesFlowStore
        .listByTwin("opportunities", twinId),
    listTwinOrders: ({ twinId }) =>
      global.INFINICUS.DT
        .salesFlowStore
        .listByTwin("orders", twinId),
    listTwinRevenueStreams: ({ twinId }) =>
      global.INFINICUS.DT
        .salesFlowStore
        .listByTwin("revenue_streams", twinId)
  });

  runtime.registerService(
    "dt.sales_revenue_flow_twin",
    api,
    { block: "DT-09" }
  );

  runtime.registerRoute(
    "dt.sales_revenue_flow.build",
    buildSalesRevenueFlow
  );

  global.INFINICUS.DT.salesRevenueFlowTwinEngine = api;
})(window);
