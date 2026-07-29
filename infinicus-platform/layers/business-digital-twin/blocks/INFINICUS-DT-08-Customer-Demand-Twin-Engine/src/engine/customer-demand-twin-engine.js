(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function buildCustomerDemandState({
    customerHandoffId,
    profileInputs = [],
    segmentInputs = [],
    stateInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .financialStateTwinEngine
        .getCustomerHandoff({
          customerHandoffId
        });

    if (!handoff.ok) return handoff;

    const segments = [];

    for (const input of segmentInputs) {
      const built =
        global.INFINICUS.DT
          .customerSegmentModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      segments.push(built.data);

      await global.INFINICUS.DT
        .customerDemandStore
        .put("segments", built.data);
    }

    const profiles = [];

    for (const input of profileInputs) {
      const built =
        global.INFINICUS.DT
          .customerProfileModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      profiles.push(built.data);

      await global.INFINICUS.DT
        .customerDemandStore
        .put("profiles", built.data);
    }

    const states = [];

    for (const input of stateInputs) {
      const built =
        global.INFINICUS.DT
          .demandStateModel
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
        .customerDemandValidator
        .validate({
          profiles,
          segments,
          states
        });

    if (!validation.valid) {
      return runtime.failure(
        "CUSTOMER_DEMAND_STATE_INVALID",
        "Customer and demand validation failed.",
        validation
      );
    }

    for (const state of states) {
      await global.INFINICUS.DT
        .customerDemandStore
        .put("states", state);
    }

    const analysis =
      global.INFINICUS.DT
        .customerDemandAnalyzer
        .analyze(states);

    const snapshot = {
      customerDemandSnapshotId:
        runtime.createId("dt_customer_demand_snapshot"),
      customerHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      profiles:
        profiles.map(runtime.clone),
      segments:
        segments.map(runtime.clone),
      states:
        states.map(runtime.clone),
      analysis:
        runtime.clone(analysis),
      financialProfile:
        runtime.clone(handoff.data.financialProfile),
      status: "current",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .customerDemandStore
      .put("snapshots", snapshot);

    const salesHandoff = {
      salesHandoffId:
        runtime.createId("dt_sales_handoff"),
      targetBlock: "DT-09",
      customerDemandSnapshotId:
        snapshot.customerDemandSnapshotId,
      financialSnapshotId:
        handoff.data.financialSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      customerProfiles:
        profiles.map(runtime.clone),
      customerSegments:
        segments.map(runtime.clone),
      demandStates:
        states.map(runtime.clone),
      customerDemandAnalysis:
        runtime.clone(analysis),
      financialProfile:
        runtime.clone(handoff.data.financialProfile),
      organizationContext:
        runtime.clone(handoff.data.organizationContext),
      sourceEntities:
        handoff.data.sourceEntities.map(runtime.clone),
      sourceRelationships:
        handoff.data.sourceRelationships.map(runtime.clone),
      sourceContext:
        runtime.clone(handoff.data.sourceContext),
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .customerDemandStore
      .put("sales_handoffs", salesHandoff);

    await runtime.emit(
      "dt.customer_demand.completed",
      {
        customerDemandSnapshot:
          snapshot,
        salesHandoffId:
          salesHandoff.salesHandoffId
      }
    );

    return runtime.success({
      customerDemandSnapshot:
        snapshot,
      salesHandoff
    });
  }

  const api = Object.freeze({
    buildCustomerDemandState,
    getCustomerDemandSnapshot: ({ customerDemandSnapshotId }) =>
      global.INFINICUS.DT
        .customerDemandStore
        .get(
          "snapshots",
          customerDemandSnapshotId
        ),
    getSalesHandoff: ({ salesHandoffId }) =>
      global.INFINICUS.DT
        .customerDemandStore
        .get(
          "sales_handoffs",
          salesHandoffId
        ),
    listTwinCustomerProfiles: ({ twinId }) =>
      global.INFINICUS.DT
        .customerDemandStore
        .listByTwin("profiles", twinId),
    listTwinCustomerSegments: ({ twinId }) =>
      global.INFINICUS.DT
        .customerDemandStore
        .listByTwin("segments", twinId),
    listTwinDemandStates: ({ twinId }) =>
      global.INFINICUS.DT
        .customerDemandStore
        .listByTwin("states", twinId)
  });

  runtime.registerService(
    "dt.customer_demand_twin",
    api,
    { block: "DT-08" }
  );

  runtime.registerRoute(
    "dt.customer_demand.build",
    buildCustomerDemandState
  );

  global.INFINICUS.DT.customerDemandTwinEngine = api;
})(window);
