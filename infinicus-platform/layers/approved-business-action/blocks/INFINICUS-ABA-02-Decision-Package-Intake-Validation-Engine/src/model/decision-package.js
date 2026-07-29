(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.decisionId || !input.recommendationId || !input.businessId) {
      return runtime.failure(
        "ABA_DECISION_PACKAGE_INVALID",
        "decisionId, recommendationId, and businessId are required."
      );
    }

    return runtime.success({
      decisionPackageId:
        input.decisionPackageId || runtime.createId("aba_decision_package"),
      packageVersion: String(input.packageVersion || "1.0.0"),
      sourceLayer: String(input.sourceLayer || "AI_DECISION_INTELLIGENCE"),
      sourceBlock: String(input.sourceBlock || "ADI"),
      decisionId: String(input.decisionId),
      recommendationId: String(input.recommendationId),
      businessId: String(input.businessId),
      twinId: input.twinId ? String(input.twinId) : null,
      simulationRunId: input.simulationRunId ? String(input.simulationRunId) : null,
      scenarioId: input.scenarioId ? String(input.scenarioId) : null,
      recommendation: runtime.clone(input.recommendation || {}),
      decision: runtime.clone(input.decision || {}),
      approvals: runtime.clone(input.approvals || []),
      simulationEvidence: runtime.clone(input.simulationEvidence || {}),
      riskEvidence: runtime.clone(input.riskEvidence || []),
      constraints: runtime.clone(input.constraints || []),
      dependencies: runtime.clone(input.dependencies || []),
      expectedOutcomes: runtime.clone(input.expectedOutcomes || []),
      confidence: Number(input.confidence ?? 0),
      lineage: runtime.clone(input.lineage || []),
      correlationId: input.correlationId || runtime.createId("aba_correlation"),
      causationId: input.causationId || null,
      issuedAt: input.issuedAt || new Date().toISOString(),
      expiresAt: input.expiresAt || null,
      revokedAt: input.revokedAt || null,
      status: String(input.status || "pending_validation")
    });
  }

  global.INFINICUS.ABA.decisionPackageModel = Object.freeze({ create });
})(window);
