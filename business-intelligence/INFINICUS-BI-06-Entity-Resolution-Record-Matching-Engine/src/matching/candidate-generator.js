(function (global) {
  "use strict";

  function blockingKey(record, fields = []) {
    if (!fields.length) return "__all__";

    return fields
      .map(field =>
        global.INFINICUS.BI
          .entitySimilarity
          .normalize(record[field])
      )
      .join("|");
  }

  function generate(records = [], blockingFields = []) {
    const blocks = new Map();

    for (const item of records) {
      const key =
        blockingKey(
          item.record,
          blockingFields
        );

      if (!blocks.has(key)) {
        blocks.set(key, []);
      }

      blocks.get(key).push(item);
    }

    const pairs = [];

    for (const group of blocks.values()) {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          pairs.push({
            left: group[i],
            right: group[j]
          });
        }
      }
    }

    return pairs;
  }

  global.INFINICUS.BI.matchCandidateGenerator =
    Object.freeze({
      blockingKey,
      generate
    });
})(window);
