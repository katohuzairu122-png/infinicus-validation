(function (global) {
  "use strict";

  function build(metric, warehouseDataset) {
    return {
      metricId:
        metric.metricId,
      metricCode:
        metric.code,
      warehouseDatasetId:
        metric.warehouseDatasetId,
      datasetContractId:
        warehouseDataset.datasetContractId,
      sourceField:
        metric.sourceField,
      dependencies:
        [...metric.dependencies],
      dimensions:
        [...metric.dimensions],
      filters:
        structuredClone(metric.filters),
      version:
        metric.version,
      createdAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.metricLineageBuilder =
    Object.freeze({ build });
})(window);
