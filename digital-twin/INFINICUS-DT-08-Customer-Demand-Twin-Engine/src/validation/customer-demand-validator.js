(function (global) {
  "use strict";

  function validate({
    profiles = [],
    segments = [],
    states = []
  } = {}) {
    const issues = [];
    const profileIds =
      new Set(
        profiles.map(profile =>
          profile.customerProfileId
        )
      );

    const segmentIds =
      new Set(
        segments.map(segment =>
          segment.customerSegmentId
        )
      );

    for (const state of states) {
      if (
        state.customerProfileId &&
        !profileIds.has(state.customerProfileId)
      ) {
        issues.push(
          `Unknown customer profile: ${state.customerProfileId}`
        );
      }

      if (
        state.customerSegmentId &&
        !segmentIds.has(state.customerSegmentId)
      ) {
        issues.push(
          `Unknown customer segment: ${state.customerSegmentId}`
        );
      }

      for (const field of [
        "retentionRatePercent",
        "churnRatePercent"
      ]) {
        if (
          state[field] != null &&
          (
            state[field] < 0 ||
            state[field] > 100
          )
        ) {
          issues.push(
            `${field} must be between 0 and 100.`
          );
        }
      }

      if (
        state.confidence < 0 ||
        state.confidence > 1
      ) {
        issues.push(
          "Demand-state confidence must be between 0 and 1."
        );
      }
    }

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.customerDemandValidator =
    Object.freeze({ validate });
})(window);
