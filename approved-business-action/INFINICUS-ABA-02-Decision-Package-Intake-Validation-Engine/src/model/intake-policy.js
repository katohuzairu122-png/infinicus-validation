(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      intakePolicyId:
        input.intakePolicyId || runtime.createId("aba_intake_policy"),
      name: String(input.name || "Default decision intake policy"),
      acceptedPackageVersions:
        runtime.clone(input.acceptedPackageVersions || ["1.0.0"]),
      acceptedSourceLayers:
        runtime.clone(input.acceptedSourceLayers || ["AI_DECISION_INTELLIGENCE"]),
      minimumConfidence:
        Math.max(0, Math.min(1, Number(input.minimumConfidence ?? 0.6))),
      requireSimulationEvidence: input.requireSimulationEvidence !== false,
      requireRiskEvidence: input.requireRiskEvidence !== false,
      requireConstraints: input.requireConstraints !== false,
      requireExpectedOutcomes: input.requireExpectedOutcomes !== false,
      requireApprovalRecord: input.requireApprovalRecord === true,
      allowedDecisionStates:
        runtime.clone(
          input.allowedDecisionStates || ["accepted", "accepted_with_conditions"]
        ),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.intakePolicyModel = Object.freeze({ create });
})(window);
