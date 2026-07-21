(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(
      0,
      Math.min(
        100,
        Number(value || 0)
      )
    );
  }

  function score(opportunity) {
    const value =
      clamp(
        opportunity.expectedValueScore
      );

    const readiness =
      clamp(opportunity.readinessScore);

    const feasibility =
      clamp(opportunity.feasibilityScore);

    const fit =
      clamp(
        opportunity.strategicFitScore
      );

    const effort =
      clamp(opportunity.effortScore);

    const risk =
      clamp(opportunity.riskScore);

    const grossScore =
      (
        value * 0.30 +
        readiness * 0.20 +
        feasibility * 0.20 +
        fit * 0.20 +
        (100 - effort) * 0.10
      );

    const riskAdjustedScore =
      grossScore *
      (1 - risk / 100);

    return {
      grossOpportunityScore:
        Number(grossScore.toFixed(4)),
      riskAdjustedOpportunityScore:
        Number(
          riskAdjustedScore.toFixed(4)
        )
    };
  }

  function category(scoreValue) {
    if (scoreValue >= 75) return "priority";
    if (scoreValue >= 50) return "promising";
    if (scoreValue >= 30) return "conditional";
    return "low_priority";
  }

  global.INFINICUS.DT.opportunityScorer =
    Object.freeze({
      clamp,
      score,
      category
    });
})(window);
