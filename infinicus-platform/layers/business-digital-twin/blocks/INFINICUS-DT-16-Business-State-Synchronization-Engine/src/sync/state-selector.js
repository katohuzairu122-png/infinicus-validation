(function (global) {
  "use strict";

  function sourceRank(
    sourceType,
    policy
  ) {
    const index =
      policy.sourcePriority
        .indexOf(sourceType);

    return index === -1
      ? Number.MAX_SAFE_INTEGER
      : index;
  }

  function ageMinutes(timestamp) {
    const time =
      new Date(timestamp).getTime();

    return Number.isNaN(time)
      ? Infinity
      : Math.max(
          0,
          (
            Date.now() -
            time
          ) / 60000
        );
  }

  function choose(
    current,
    incoming,
    policy
  ) {
    if (!current) {
      return {
        selected:
          incoming,
        reason:
          "first_value"
      };
    }

    const incomingAge =
      ageMinutes(
        incoming.observedAt
      );

    if (
      incomingAge >
      policy.maximumAgeMinutes
    ) {
      return {
        selected:
          current,
        reason:
          "incoming_stale"
      };
    }

    const currentRank =
      sourceRank(
        current.sourceType,
        policy
      );

    const incomingRank =
      sourceRank(
        incoming.sourceType,
        policy
      );

    if (
      incomingRank <
      currentRank
    ) {
      return {
        selected:
          incoming,
        reason:
          "higher_priority_source"
      };
    }

    if (
      incomingRank >
      currentRank
    ) {
      return {
        selected:
          current,
        reason:
          "lower_priority_source"
      };
    }

    if (
      Number(incoming.confidence || 0) >
      Number(current.confidence || 0)
    ) {
      return {
        selected:
          incoming,
        reason:
          "higher_confidence"
      };
    }

    if (
      new Date(
        incoming.observedAt
      ).getTime() >
      new Date(
        current.observedAt
      ).getTime()
    ) {
      return {
        selected:
          incoming,
        reason:
          "newer_observation"
      };
    }

    return {
      selected:
        current,
      reason:
        "current_retained"
    };
  }

  global.INFINICUS.DT.stateSelector =
    Object.freeze({
      sourceRank,
      ageMinutes,
      choose
    });
})(window);
