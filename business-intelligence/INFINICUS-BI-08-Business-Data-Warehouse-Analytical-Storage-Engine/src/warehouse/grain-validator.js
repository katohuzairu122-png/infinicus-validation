(function (global) {
  "use strict";

  function buildKey(record, fields = []) {
    return fields
      .map(field => String(record[field] ?? ""))
      .join("|");
  }

  function validate(records = [], keyFields = []) {
    if (!keyFields.length) {
      return {
        valid: true,
        duplicateKeys: []
      };
    }

    const seen = new Set();
    const duplicates = new Set();

    for (const record of records) {
      const key = buildKey(record, keyFields);

      if (seen.has(key)) {
        duplicates.add(key);
      } else {
        seen.add(key);
      }
    }

    return {
      valid: duplicates.size === 0,
      duplicateKeys: [...duplicates]
    };
  }

  global.INFINICUS.BI.warehouseGrainValidator =
    Object.freeze({
      buildKey,
      validate
    });
})(window);
