(function (global) {
  "use strict";

  const OPERATORS = Object.freeze({
    add: values => values.reduce((a, b) => a + b, 0),
    subtract: values => values.slice(1).reduce((a, b) => a - b, values[0] || 0),
    multiply: values => values.reduce((a, b) => a * b, 1),
    divide: values => values.slice(1).reduce((a, b) => b === 0 ? a : a / b, values[0] || 0),
    average: values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    percentage: values => values[1] ? values[0] / values[1] * 100 : 0
  });

  function evaluate(record, configuration = {}) {
    const operator = String(configuration.operator || "");
    const fn = OPERATORS[operator];

    if (!fn) {
      throw new Error(`Unsupported formula operator: ${operator}`);
    }

    const values = (configuration.fields || []).map(field => {
      const value = Number(record[field]);
      if (!Number.isFinite(value)) {
        throw new Error(`Formula field is not numeric: ${field}`);
      }
      return value;
    });

    return fn(values);
  }

  global.INFINICUS.BI.formulaEngine =
    Object.freeze({
      OPERATORS,
      evaluate
    });
})(window);
