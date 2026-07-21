(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function registerPolicy(input = {}) {
    const built =
      global.INFINICUS.DT
        .integrityPolicyModel
        .create(input);

    if (!built.ok) return built;

    return global.INFINICUS.DT
      .integrityStore
      .put("policies", built.data);
  }

  async function validateTwin({
    integrityHandoffId,
    integrityPolicyId
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .opportunityStrategicPositionEngine
        .getIntegrityHandoff({
          integrityHandoffId
        });

    if (!handoff.ok) return handoff;

    const policy =
      await global.INFINICUS.DT
        .integrityStore
        .get("policies", integrityPolicyId);

    if (!policy.ok) return policy;

    const validation =
      global.INFINICUS.DT
        .twinIntegrityValidator
        .validate({
          handoff: handoff.data,
          policy: policy.data
        });

    const confidence =
      global.INFINICUS.DT
        .confidenceReadinessAnalyzer
        .weightedConfidence(
          handoff.data.synchronizedState
        );

    const readiness =
      global.INFINICUS.DT
        .confidenceReadinessAnalyzer
        .score({
          validation,
          confidence,
          opportunityAnalysis:
            handoff.data.opportunityAnalysis,
          riskAnalysis:
            handoff.data.riskAnalysis,
          policy:
            policy.data
        });

    const issueRecords = [];

    for (const issue of validation.issues) {
      const record = {
        integrityIssueId:
          runtime.createId("dt_integrity_issue"),
        integrityHandoffId,
        businessId:
          handoff.data.businessId,
        twinId:
          handoff.data.twinId,
        ...runtime.clone(issue),
        status: "open",
        correlationId:
          handoff.data.correlationId,
        createdAt:
          new Date().toISOString()
      };

      issueRecords.push(record);

      await global.INFINICUS.DT
        .integrityStore
        .put("issues", record);
    }

    const snapshot = {
      integritySnapshotId:
        runtime.createId("dt_integrity_snapshot"),
      integrityHandoffId,
      integrityPolicyId,
      strategicPositionSnapshotId:
        handoff.data.strategicPositionSnapshotId,
      riskSnapshotId:
        handoff.data.riskSnapshotId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      validation:
        runtime.clone(validation),
      readiness:
        runtime.clone(readiness),
      issues:
        issueRecords.map(runtime.clone),
      opportunityAnalysis:
        runtime.clone(handoff.data.opportunityAnalysis),
      riskAnalysis:
        runtime.clone(handoff.data.riskAnalysis),
      stateCount:
        handoff.data.synchronizedState.length,
      status:
        readiness.ready
          ? "validated"
          : "not_ready",
      correlationId:
        handoff.data.correlationId,
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .integrityStore
      .put("snapshots", snapshot);

    const historyHandoff = {
      historyHandoffId:
        runtime.createId("dt_history_handoff"),
      targetBlock: "DT-22",
      integritySnapshotId:
        snapshot.integritySnapshotId,
      strategicPositionSnapshotId:
        handoff.data.strategicPositionSnapshotId,
      riskSnapshotId:
        handoff.data.riskSnapshotId,
      businessId:
        snapshot.businessId,
      twinId:
        snapshot.twinId,
      synchronizedState:
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
        runtime.clone(validation),
      readiness:
        runtime.clone(readiness),
      correlationId:
        handoff.data.correlationId,
      status:
        readiness.ready
          ? "ready"
          : "not_ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .integrityStore
      .put("history_handoffs", historyHandoff);

    await runtime.emit(
      "dt.twin_integrity.validated",
      {
        integritySnapshot: snapshot,
        historyHandoffId:
          historyHandoff.historyHandoffId
      }
    );

    return runtime.success({
      integritySnapshot: snapshot,
      historyHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    validateTwin,
    getIntegritySnapshot: ({ integritySnapshotId }) =>
      global.INFINICUS.DT
        .integrityStore
        .get("snapshots", integritySnapshotId),
    getHistoryHandoff: ({ historyHandoffId }) =>
      global.INFINICUS.DT
        .integrityStore
        .get("history_handoffs", historyHandoffId),
    listIntegrityIssues: () =>
      global.INFINICUS.DT
        .integrityStore
        .list("issues")
  });

  runtime.registerService(
    "dt.twin_integrity_confidence",
    api,
    { block: "DT-21" }
  );

  runtime.registerRoute(
    "dt.integrity_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "dt.twin_integrity.validate",
    validateTwin
  );

  global.INFINICUS.DT
    .twinIntegrityConfidenceEngine = api;
})(window);
