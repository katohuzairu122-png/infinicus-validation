(function (global) {
  "use strict";

  function compare(actual, benchmark, direction = "higher_is_better") {
    const variance =
      global.INFINICUS.BI
        .varianceEngine
        .calculate(actual, benchmark, direction);

    return {
      ...variance,
      position:
        !variance.valid ? "unknown" :
        variance.absoluteVariance === 0 ? "at_benchmark" :
        variance.favorable ? "above_benchmark" :
        "below_benchmark"
    };
  }

  global.INFINICUS.BI.benchmarkEngine =
    Object.freeze({ compare });
})(window);
