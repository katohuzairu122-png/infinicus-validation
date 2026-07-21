(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = []) {
    return metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .map((result, index) => ({
        rank: index + 1,
        metricCode: result.metricCode,
        groupKey: result.groupKey,
        value: result.value,
        unit: result.unit
      }));
  }

  global.INFINICUS.BI.customerCohortRanker =
    Object.freeze({ rank });
})(window);
