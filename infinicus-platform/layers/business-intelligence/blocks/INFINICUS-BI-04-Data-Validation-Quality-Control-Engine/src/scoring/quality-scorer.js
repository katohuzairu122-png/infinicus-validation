(function (global) {
  "use strict";

  function score({
    totalRecords,
    acceptedRecords,
    warningCount,
    errorCount
  }) {
    if (!totalRecords) {
      return {
        score: 100,
        level: "empty",
        acceptanceRate: 1
      };
    }

    const acceptanceRate =
      acceptedRecords / totalRecords;

    const warningPenalty =
      Math.min(10, warningCount * 0.5);

    const errorPenalty =
      Math.min(50, errorCount * 2);

    const value = Math.max(
      0,
      acceptanceRate * 100 -
      warningPenalty -
      errorPenalty
    );

    return {
      score: Number(value.toFixed(2)),
      level:
        value >= 95 ? "excellent" :
        value >= 85 ? "good" :
        value >= 70 ? "acceptable" :
        value >= 50 ? "poor" :
        "critical",
      acceptanceRate:
        Number(acceptanceRate.toFixed(4))
    };
  }

  global.INFINICUS.BI.qualityScorer =
    Object.freeze({ score });
})(window);
