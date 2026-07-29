(function (global) {
  "use strict";

  function evaluate(record, filter) {
    const value = record[filter.field];

    switch (filter.operator) {
      case "eq":
        return value === filter.value;

      case "neq":
        return value !== filter.value;

      case "gt":
        return value > filter.value;

      case "gte":
        return value >= filter.value;

      case "lt":
        return value < filter.value;

      case "lte":
        return value <= filter.value;

      case "in":
        return (filter.value || []).includes(value);

      case "not_in":
        return !(filter.value || []).includes(value);

      case "contains":
        return String(value || "")
          .includes(String(filter.value || ""));

      default:
        return true;
    }
  }

  function apply(records, filters = []) {
    return records.filter(record =>
      filters.every(filter =>
        evaluate(record, filter)
      )
    );
  }

  global.INFINICUS.BI.metricFilterEngine =
    Object.freeze({
      evaluate,
      apply
    });
})(window);
