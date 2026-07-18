(function (global) {
  "use strict";

  function equivalent(
    left,
    right,
    tolerance = 0
  ) {
    if (
      Number.isFinite(Number(left)) &&
      Number.isFinite(Number(right))
    ) {
      return Math.abs(
        Number(left) -
        Number(right)
      ) <= tolerance;
    }

    return JSON.stringify(left) ===
      JSON.stringify(right);
  }

  function detect({
    current,
    incoming,
    policy
  }) {
    if (!current) {
      return {
        conflict: false,
        reason:
          "no_current_state"
      };
    }

    const same =
      equivalent(
        current.value,
        incoming.value,
        policy.conflictTolerance
      );

    if (same) {
      return {
        conflict: false,
        reason:
          "equivalent_value"
      };
    }

    const bothHighConfidence =
      Number(current.confidence || 0) >=
        policy.minimumConfidence &&
      Number(incoming.confidence || 0) >=
        policy.minimumConfidence;

    return {
      conflict:
        bothHighConfidence,
      reason:
        bothHighConfidence
          ? "high_confidence_value_conflict"
          : "resolvable_value_difference"
    };
  }

  global.INFINICUS.DT
    .stateConflictDetector =
      Object.freeze({
        equivalent,
        detect
      });
})(window);
