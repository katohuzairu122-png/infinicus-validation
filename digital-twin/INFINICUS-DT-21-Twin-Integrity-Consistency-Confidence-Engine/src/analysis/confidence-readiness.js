(function (global) {
  "use strict";

  function weightedConfidence(states = []) {
    if (!states.length) return 0;

    const weights = {
      observed: 1,
      calculated: 0.9,
      inferred: 0.7,
      assumed: 0.4,
      simulated: 0
    };

    const weighted = states.reduce((sum, state) => {
      const sourceWeight = weights[state.sourceType] ?? 0.5;
      return sum + Number(state.confidence || 0) * sourceWeight;
    }, 0);

    return Number((weighted / states.length).toFixed(4));
  }

  function score({
    validation,
    confidence,
    opportunityAnalysis,
    riskAnalysis,
    policy
  }) {
    let readiness = 100;

    readiness -= Math.min(30, validation.issues.length * 4);
    readiness -= Math.min(25, validation.staleStateCount * 0.5);
    readiness -= Math.min(25, validation.conflictCount * 5);
    readiness -= Math.min(30, validation.blockingBreachCount * 10);
    readiness -= Math.max(0, validation.assumedPercent - policy.maximumAssumedStatePercent);
    readiness -= Math.max(
      0,
      (policy.minimumOverallConfidence - confidence) * 100
    );

    const riskPenalty =
      Math.min(20, Number(riskAnalysis?.maximumResidualRiskScore || 0) * 0.2);

    readiness -= riskPenalty;

    const opportunityBonus =
      Math.min(
        5,
        Number(opportunityAnalysis?.priorityCount || 0)
      );

    readiness += opportunityBonus;

    readiness = Math.max(0, Math.min(100, readiness));

    return {
      readinessScore: Number(readiness.toFixed(4)),
      overallConfidence: confidence,
      ready:
        readiness >= policy.minimumReadinessScore &&
        confidence >= policy.minimumOverallConfidence &&
        validation.valid,
      riskPenalty: Number(riskPenalty.toFixed(4)),
      opportunityBonus
    };
  }

  global.INFINICUS.DT.confidenceReadinessAnalyzer =
    Object.freeze({ weightedConfidence, score });
})(window);
