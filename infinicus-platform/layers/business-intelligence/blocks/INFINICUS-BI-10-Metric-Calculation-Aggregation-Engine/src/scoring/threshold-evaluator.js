(function (global) {
  "use strict";

  function evaluate(value, metric) {
    const thresholds =
      metric.thresholds || {};

    if (value == null) {
      return {
        status: "no_data",
        targetMet: false
      };
    }

    let status = "normal";

    if (
      thresholds.criticalBelow != null &&
      value < thresholds.criticalBelow
    ) {
      status = "critical";
    } else if (
      thresholds.warningBelow != null &&
      value < thresholds.warningBelow
    ) {
      status = "warning";
    } else if (
      thresholds.criticalAbove != null &&
      value > thresholds.criticalAbove
    ) {
      status = "critical";
    } else if (
      thresholds.warningAbove != null &&
      value > thresholds.warningAbove
    ) {
      status = "warning";
    } else if (
      thresholds.goodAbove != null &&
      value >= thresholds.goodAbove
    ) {
      status = "good";
    }

    const targetMet =
      metric.target == null
        ? null
        : thresholds.targetDirection === "below"
          ? value <= metric.target
          : value >= metric.target;

    return {
      status,
      targetMet
    };
  }

  global.INFINICUS.BI.metricThresholdEvaluator =
    Object.freeze({ evaluate });
})(window);
