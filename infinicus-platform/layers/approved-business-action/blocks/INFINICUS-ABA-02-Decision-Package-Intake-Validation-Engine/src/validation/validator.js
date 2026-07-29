(function (global) {
  "use strict";

  function validate({ packageData, policy }) {
    const issues = [];
    const add = (code, severity, message, extra = {}) =>
      issues.push({ code, severity, message, ...extra });

    if (!policy.acceptedPackageVersions.includes(packageData.packageVersion)) {
      add("PACKAGE_VERSION_UNSUPPORTED", "high", "Unsupported package version.");
    }

    if (!policy.acceptedSourceLayers.includes(packageData.sourceLayer)) {
      add("SOURCE_LAYER_UNSUPPORTED", "high", "Unsupported source layer.");
    }

    if (!policy.allowedDecisionStates.includes(packageData.decision?.state)) {
      add(
        "DECISION_STATE_NOT_ELIGIBLE",
        "high",
        `Decision state is not eligible: ${packageData.decision?.state || "missing"}`
      );
    }

    if (packageData.confidence < policy.minimumConfidence) {
      add(
        "CONFIDENCE_BELOW_POLICY",
        "high",
        "Decision confidence is below policy.",
        { actual: packageData.confidence, minimum: policy.minimumConfidence }
      );
    }

    if (
      policy.requireSimulationEvidence &&
      Object.keys(packageData.simulationEvidence || {}).length === 0
    ) {
      add("SIMULATION_EVIDENCE_MISSING", "critical", "Simulation evidence is required.");
    }

    if (policy.requireRiskEvidence && !packageData.riskEvidence.length) {
      add("RISK_EVIDENCE_MISSING", "high", "Risk evidence is required.");
    }

    if (policy.requireConstraints && !packageData.constraints.length) {
      add("CONSTRAINTS_MISSING", "high", "Decision constraints are required.");
    }

    if (policy.requireExpectedOutcomes && !packageData.expectedOutcomes.length) {
      add("EXPECTED_OUTCOMES_MISSING", "high", "Expected outcomes are required.");
    }

    if (policy.requireApprovalRecord && !packageData.approvals.length) {
      add("APPROVAL_RECORD_MISSING", "critical", "Approval record is required.");
    }

    if (packageData.revokedAt) {
      add("DECISION_REVOKED", "critical", "Decision package has been revoked.");
    }

    if (
      packageData.expiresAt &&
      new Date(packageData.expiresAt).getTime() <= Date.now()
    ) {
      add("DECISION_EXPIRED", "critical", "Decision package has expired.");
    }

    if (!packageData.lineage.length) {
      add("LINEAGE_MISSING", "high", "Decision package lineage is required.");
    }

    if (!packageData.correlationId) {
      add("CORRELATION_ID_MISSING", "high", "Correlation ID is required.");
    }

    return {
      valid: !issues.some(item =>
        ["high", "critical"].includes(item.severity)
      ),
      issues
    };
  }

  global.INFINICUS.ABA.decisionPackageValidator =
    Object.freeze({ validate });
})(window);
