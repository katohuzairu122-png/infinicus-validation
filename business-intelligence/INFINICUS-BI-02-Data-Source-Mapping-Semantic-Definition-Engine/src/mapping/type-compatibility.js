(function (global) {
  "use strict";

  const COMPATIBILITY = Object.freeze({
    string: ["string"],
    integer: ["integer", "number", "string"],
    number: ["integer", "number", "string"],
    boolean: ["boolean", "string", "integer"],
    date: ["date", "datetime", "string"],
    datetime: ["date", "datetime", "string"],
    currency: ["integer", "number", "string"],
    percentage: ["integer", "number", "string"],
    identifier: ["string", "integer"]
  });

  function evaluate({
    sourceType,
    targetType,
    conversionRule = null
  }) {
    const accepted =
      COMPATIBILITY[targetType] || [targetType];

    const directlyCompatible =
      accepted.includes(sourceType);

    const compatible =
      directlyCompatible ||
      Boolean(conversionRule);

    return {
      compatible,
      directlyCompatible,
      sourceType,
      targetType,
      conversionRequired:
        !directlyCompatible && Boolean(conversionRule),
      reason:
        compatible
          ? null
          : `Cannot map ${sourceType} to ${targetType} without a conversion rule.`
    };
  }

  global.INFINICUS.BI.typeCompatibility =
    Object.freeze({
      COMPATIBILITY,
      evaluate
    });
})(window);
