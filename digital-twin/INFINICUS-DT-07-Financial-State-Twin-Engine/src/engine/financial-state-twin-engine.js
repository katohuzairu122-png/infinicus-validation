(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function buildFinancialState({
    financialHandoffId,
    accountInputs = [],
    stateInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .organizationalStructureEngine
        .getFinancialHandoff({
          financialHandoffId
        });

    if (!handoff.ok) return handoff;

    const unitIds =
      new Set(
        handoff.data.organizationUnits
          .map(unit => unit.organizationUnitId)
      );

    const accounts = [];

    for (const input of accountInputs) {
      if (
        input.organizationUnitId &&
        !unitIds.has(input.organizationUnitId)
      ) {
        return runtime.failure(
          "FINANCIAL_ACCOUNT_UNIT_INVALID",
          `Unknown organization unit: ${input.organizationUnitId}`
        );
      }

      const built =
        global.INFINICUS.DT
          .financialAccountModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      accounts.push(built.data);

      await global.INFINICUS.DT
        .financialStateStore
        .put("accounts", built.data);
    }

    const accountIds =
      new Set(
        accounts.map(account =>
          account.financialAccountId
        )
      );

    const states = [];

    for (const input of stateInputs) {
      if (
        !accountIds.has(input.financialAccountId)
      ) {
        return runtime.failure(
          "FINANCIAL_STATE_ACCOUNT_INVALID",
          `Unknown financial account: ${input.financialAccountId}`
        );
      }

      const built =
        global.INFINICUS.DT
          .financialStateModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      states.push(built.data);

      await global.INFINICUS.DT
        .financialStateStore
        .put("states", built.data);
    }

    const consistency =
      global.INFINICUS.DT
        .financialConsistencyValidator
        .validate({
          accounts,
          states
        });

    const snapshot = {
      financialSnapshotId:
        runtime.createId("dt_financial_snapshot"),
      financialHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      accounts:
        accounts.map(runtime.clone),
      states:
        states.map(runtime.clone),
      profile:
        runtime.clone(consistency.profile),
      consistency:
        runtime.clone(consistency),
      organizationContext: {
        units:
          handoff.data.organizationUnits.map(runtime.clone),
        roles:
          handoff.data.roles.map(runtime.clone),
        positions:
          handoff.data.positions.map(runtime.clone)
      },
      status:
        consistency.valid
          ? "current"
          : "current_with_issues",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .financialStateStore
      .put("snapshots", snapshot);

    const customerHandoff = {
      customerHandoffId:
        runtime.createId("dt_customer_handoff"),
      targetBlock: "DT-08",
      financialSnapshotId:
        snapshot.financialSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      financialProfile:
        runtime.clone(snapshot.profile),
      financialConsistency:
        runtime.clone(snapshot.consistency),
      organizationContext:
        runtime.clone(snapshot.organizationContext),
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
      .financialStateStore
      .put(
        "customer_handoffs",
        customerHandoff
      );

    await runtime.emit(
      "dt.financial_state.completed",
      {
        financialSnapshot:
          snapshot,
        customerHandoffId:
          customerHandoff.customerHandoffId
      }
    );

    return runtime.success({
      financialSnapshot:
        snapshot,
      customerHandoff
    });
  }

  const api = Object.freeze({
    buildFinancialState,
    getFinancialSnapshot: ({ financialSnapshotId }) =>
      global.INFINICUS.DT
        .financialStateStore
        .get(
          "snapshots",
          financialSnapshotId
        ),
    getCustomerHandoff: ({ customerHandoffId }) =>
      global.INFINICUS.DT
        .financialStateStore
        .get(
          "customer_handoffs",
          customerHandoffId
        ),
    listTwinAccounts: ({ twinId }) =>
      global.INFINICUS.DT
        .financialStateStore
        .listByTwin("accounts", twinId),
    listTwinFinancialStates: ({ twinId }) =>
      global.INFINICUS.DT
        .financialStateStore
        .listByTwin("states", twinId)
  });

  runtime.registerService(
    "dt.financial_state_twin",
    api,
    { block: "DT-07" }
  );

  runtime.registerRoute(
    "dt.financial_state.build",
    buildFinancialState
  );

  global.INFINICUS.DT.financialStateTwinEngine = api;
})(window);
