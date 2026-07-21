(function (global) {
  "use strict";

  function score(left, right, rule) {
    let weighted = 0;
    let totalWeight = 0;
    const fieldScores = [];

    for (const fieldRule of rule.fields) {
      const weight =
        Math.max(0, Number(fieldRule.weight || 0));

      const value =
        global.INFINICUS.BI
          .entitySimilarity
          .fieldScore(
            left[fieldRule.field],
            right[fieldRule.field],
            fieldRule
          );

      weighted += value * weight;
      totalWeight += weight;

      fieldScores.push({
        field:
          fieldRule.field,
        method:
          fieldRule.method,
        weight,
        score:
          Number(value.toFixed(4))
      });
    }

    const overall =
      totalWeight
        ? weighted / totalWeight
        : 0;

    const classification =
      overall >= rule.automaticMatchThreshold
        ? "automatic_match"
        : overall >= rule.reviewThreshold
          ? "manual_review"
          : "no_match";

    return {
      score:
        Number(overall.toFixed(4)),
      classification,
      fieldScores
    };
  }

  global.INFINICUS.BI.entityMatchScorer =
    Object.freeze({ score });
})(window);
