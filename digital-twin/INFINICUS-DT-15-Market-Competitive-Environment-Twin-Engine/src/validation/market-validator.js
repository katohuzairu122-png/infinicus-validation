(function (global) {
  "use strict";

  function validate({
    markets = [],
    segments = [],
    competitors = [],
    states = [],
    externalForces = []
  } = {}) {
    const issues = [];

    const marketIds =
      new Set(
        markets.map(item => item.marketId)
      );

    const segmentIds =
      new Set(
        segments.map(
          item =>
            item.marketSegmentId
        )
      );

    for (const segment of segments) {
      if (
        !marketIds.has(
          segment.marketId
        )
      ) {
        issues.push(
          `Unknown market for segment: ${segment.marketId}`
        );
      }
    }

    for (const competitor of competitors) {
      for (const marketId of competitor.marketIds) {
        if (!marketIds.has(marketId)) {
          issues.push(
            `Unknown competitor market: ${marketId}`
          );
        }
      }

      for (
        const segmentId
        of competitor.marketSegmentIds
      ) {
        if (!segmentIds.has(segmentId)) {
          issues.push(
            `Unknown competitor segment: ${segmentId}`
          );
        }
      }

      if (
        competitor.confidence < 0 ||
        competitor.confidence > 1
      ) {
        issues.push(
          "Competitor confidence must be between 0 and 1."
        );
      }
    }

    for (const state of states) {
      if (!marketIds.has(state.marketId)) {
        issues.push(
          `Unknown market state market: ${state.marketId}`
        );
      }

      if (
        state.marketSegmentId &&
        !segmentIds.has(
          state.marketSegmentId
        )
      ) {
        issues.push(
          `Unknown market state segment: ${state.marketSegmentId}`
        );
      }

      if (
        state.confidence < 0 ||
        state.confidence > 1
      ) {
        issues.push(
          "Market-state confidence must be between 0 and 1."
        );
      }
    }

    for (
      const force
      of externalForces
    ) {
      if (
        force.marketId &&
        !marketIds.has(force.marketId)
      ) {
        issues.push(
          `Unknown external-force market: ${force.marketId}`
        );
      }

      if (
        force.probability < 0 ||
        force.probability > 1
      ) {
        issues.push(
          "External-force probability must be between 0 and 1."
        );
      }
    }

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.marketValidator =
    Object.freeze({ validate });
})(window);
