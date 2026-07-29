(function (global) {
  "use strict";

  const DATASET_TYPES = Object.freeze([
    "fact",
    "dimension",
    "aggregate",
    "snapshot"
  ]);

  const LOAD_MODES = Object.freeze([
    "append",
    "replace",
    "upsert"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const datasetType = String(input.datasetType || "");
    const loadMode = String(input.loadMode || "append");

    if (
      !input.name ||
      !input.datasetContractId ||
      !DATASET_TYPES.includes(datasetType) ||
      !LOAD_MODES.includes(loadMode)
    ) {
      return runtime.failure(
        "WAREHOUSE_DATASET_INVALID",
        "name, datasetContractId, datasetType, and loadMode are required."
      );
    }

    if (!input.grain) {
      return runtime.failure(
        "WAREHOUSE_GRAIN_REQUIRED",
        "Every warehouse dataset requires a declared grain."
      );
    }

    return runtime.success({
      warehouseDatasetId:
        input.warehouseDatasetId ||
        runtime.createId("bi_warehouse_dataset"),
      name:
        String(input.name),
      datasetContractId:
        String(input.datasetContractId),
      datasetType,
      grain:
        String(input.grain),
      primaryKeyFields:
        Array.isArray(input.primaryKeyFields)
          ? input.primaryKeyFields.map(String)
          : [],
      partitionFields:
        Array.isArray(input.partitionFields)
          ? input.partitionFields.map(String)
          : [],
      loadMode,
      slowlyChangingDimensionType:
        input.slowlyChangingDimensionType || null,
      version:
        Number(input.version || 1),
      status:
        String(input.status || "active"),
      metadata:
        runtime.clone(input.metadata || {}),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.warehouseDatasetModel =
    Object.freeze({
      DATASET_TYPES,
      LOAD_MODES,
      create
    });
})(window);
