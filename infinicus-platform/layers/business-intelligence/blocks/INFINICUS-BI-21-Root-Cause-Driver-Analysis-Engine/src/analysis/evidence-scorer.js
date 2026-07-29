(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(1, Number(value || 0)));
  }

  function score(evidence = [], counterEvidence = []) {
    const positive =
      evidence.reduce(
        (sum, item) =>
          sum +
          clamp(item.reliability ?? 0.5) *
          clamp(item.relevance ?? 0.5),
        0
      );

    const negative =
      counterEvidence.reduce(
        (sum, item) =>
          sum +
          clamp(item.reliability ?? 0.5) *
          clamp(item.relevance ?? 0.5),
        0
      );

    const totalWeight =
      positive + negative;

    const confidence =
      totalWeight === 0
        ? 0
        : positive / totalWeight;

    return {
      positiveWeight:
        Number(positive.toFixed(4)),
      counterWeight:
        Number(negative.toFixed(4)),
      confidence:
        Number(confidence.toFixed(4)),
      evidenceCount:
        evidence.length,
      counterEvidenceCount:
        counterEvidence.length
    };
  }

  global.INFINICUS.BI.rootCauseEvidenceScorer =
    Object.freeze({ score });
})(window);
