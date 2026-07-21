(function (global) {
  "use strict";

  function publish(context = {}, fields = []) {
    const rows =
      Array.isArray(context.rows)
        ? context.rows
        : [];

    const projected =
      fields.length
        ? rows.map(row =>
            Object.fromEntries(
              fields.map(field => [
                field,
                row[field]
              ])
            )
          )
        : rows.map(structuredClone);

    return {
      explorationDatasetId:
        global.INFINICUS.BI.runtime
          .createId("bi_exploration_dataset"),
      fields:
        fields.length
          ? [...fields]
          : [...new Set(
              projected.flatMap(row =>
                Object.keys(row)
              )
            )],
      rows:
        projected,
      rowCount:
        projected.length,
      createdAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.explorationDatasetPublisher =
    Object.freeze({ publish });
})(window);
