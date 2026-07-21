(function (global) {
  "use strict";

  function rank(candidates = []) {
    return candidates
      .map(candidate => {
        const evidenceScore =
          global.INFINICUS.BI
            .rootCauseEvidenceScorer
            .score(
              candidate.evidence,
              candidate.counterEvidence
            );

        const contribution =
          Number(candidate.contributionScore || 0);

        const confidence =
          evidenceScore.confidence * 0.7 +
          Math.max(0, Math.min(1, contribution)) * 0.3;

        return {
          ...structuredClone(candidate),
          evidenceScore,
          confidence:
            Number(confidence.toFixed(4))
        };
      })
      .sort((a, b) =>
        b.confidence - a.confidence
      )
      .map((candidate, index) => ({
        rank: index + 1,
        ...candidate
      }));
  }

  global.INFINICUS.BI.rootCauseDriverRanker =
    Object.freeze({ rank });
})(window);
