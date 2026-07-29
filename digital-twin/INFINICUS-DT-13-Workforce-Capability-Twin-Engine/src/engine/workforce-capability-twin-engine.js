(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  async function buildWorkforceCapabilityState({
    workforceHandoffId,
    memberInputs = [],
    skillInputs = [],
    capabilityInputs = [],
    stateInputs = [],
    positionInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .inventorySupplyTwinEngine
        .getWorkforceHandoff({
          workforceHandoffId
        });

    if (!handoff.ok) return handoff;

    const positions =
      positionInputs.length
        ? positionInputs
        : handoff.data.sourceContext
            ?.organizationContext
            ?.positions || [];

    const members = [];

    for (const input of memberInputs) {
      const built =
        global.INFINICUS.DT
          .workforceMemberModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      members.push(built.data);

      await global.INFINICUS.DT
        .workforceStore
        .put("members", built.data);
    }

    const skills = [];

    for (const input of skillInputs) {
      const built =
        global.INFINICUS.DT
          .capabilitySkillModel
          .createSkill({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      skills.push(built.data);

      await global.INFINICUS.DT
        .workforceStore
        .put("skills", built.data);
    }

    const capabilities = [];

    for (const input of capabilityInputs) {
      const built =
        global.INFINICUS.DT
          .capabilitySkillModel
          .createCapability({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      capabilities.push(built.data);
    }

    const states = [];

    for (const input of stateInputs) {
      const built =
        global.INFINICUS.DT
          .workforceStateModel
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
        .workforceValidator
        .validate({
          members,
          skills,
          capabilities,
          states,
          positions
        });

    if (!validation.valid) {
      return runtime.failure(
        "WORKFORCE_CAPABILITY_STATE_INVALID",
        "Workforce and capability validation failed.",
        validation
      );
    }

    for (const capability of capabilities) {
      await global.INFINICUS.DT
        .workforceStore
        .put(
          "capabilities",
          capability
        );
    }

    for (const state of states) {
      await global.INFINICUS.DT
        .workforceStore
        .put("states", state);
    }

    const analysis =
      global.INFINICUS.DT
        .workforceAnalyzer
        .analyze({
          members,
          capabilities,
          states,
          positions
        });

    const snapshot = {
      workforceSnapshotId:
        runtime.createId(
          "dt_workforce_snapshot"
        ),
      workforceHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      members:
        members.map(runtime.clone),
      skills:
        skills.map(runtime.clone),
      capabilities:
        capabilities.map(runtime.clone),
      states:
        states.map(runtime.clone),
      positions:
        positions.map(runtime.clone),
      analysis:
        runtime.clone(analysis),
      inventoryAnalysis:
        runtime.clone(
          handoff.data.inventoryAnalysis
        ),
      operationsAnalysis:
        runtime.clone(
          handoff.data.operationsAnalysis
        ),
      status: "current",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .workforceStore
      .put("snapshots", snapshot);

    const assetHandoff = {
      assetHandoffId:
        runtime.createId("dt_asset_handoff"),
      targetBlock: "DT-14",
      workforceSnapshotId:
        snapshot.workforceSnapshotId,
      inventorySupplySnapshotId:
        handoff.data.inventorySupplySnapshotId,
      operationsSnapshotId:
        handoff.data.operationsSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      workforceAnalysis:
        runtime.clone(analysis),
      workforceMembers:
        members.map(runtime.clone),
      skills:
        skills.map(runtime.clone),
      capabilities:
        capabilities.map(runtime.clone),
      workforceStates:
        states.map(runtime.clone),
      products:
        handoff.data.products.map(runtime.clone),
      locations:
        handoff.data.locations.map(runtime.clone),
      suppliers:
        handoff.data.suppliers.map(runtime.clone),
      processes:
        handoff.data.processes.map(runtime.clone),
      resources:
        handoff.data.resources.map(runtime.clone),
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
      .workforceStore
      .put(
        "asset_handoffs",
        assetHandoff
      );

    await runtime.emit(
      "dt.workforce_capability.completed",
      {
        workforceSnapshot:
          snapshot,
        assetHandoffId:
          assetHandoff.assetHandoffId
      }
    );

    return runtime.success({
      workforceSnapshot:
        snapshot,
      assetHandoff
    });
  }

  const api = Object.freeze({
    buildWorkforceCapabilityState,
    getWorkforceSnapshot: ({
      workforceSnapshotId
    }) =>
      global.INFINICUS.DT
        .workforceStore
        .get(
          "snapshots",
          workforceSnapshotId
        ),
    getAssetHandoff: ({
      assetHandoffId
    }) =>
      global.INFINICUS.DT
        .workforceStore
        .get(
          "asset_handoffs",
          assetHandoffId
        ),
    listTwinMembers: ({ twinId }) =>
      global.INFINICUS.DT
        .workforceStore
        .listByTwin(
          "members",
          twinId
        ),
    listTwinSkills: ({ twinId }) =>
      global.INFINICUS.DT
        .workforceStore
        .listByTwin(
          "skills",
          twinId
        ),
    listTwinWorkforceStates: ({
      twinId
    }) =>
      global.INFINICUS.DT
        .workforceStore
        .listByTwin(
          "states",
          twinId
        )
  });

  runtime.registerService(
    "dt.workforce_capability_twin",
    api,
    { block: "DT-13" }
  );

  runtime.registerRoute(
    "dt.workforce_capability.build",
    buildWorkforceCapabilityState
  );

  global.INFINICUS.DT
    .workforceCapabilityTwinEngine = api;
})(window);
