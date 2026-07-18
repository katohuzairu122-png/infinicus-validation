(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = [], ascending = false) {
    const sorted = metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) =>
        ascending
          ? Number(a.value || 0) - Number(b.value || 0)
          : Number(b.value || 0) - Number(a.value || 0)
      );

    return sorted.map((result, index) => ({
      rank: index + 1,
      metricCode: result.metricCode,
      groupKey: result.groupKey,
      value: result.value,
      unit: result.unit
    }));
  }

  global.INFINICUS.BI.inventoryRanker =
    Object.freeze({ rank });
})(window);
