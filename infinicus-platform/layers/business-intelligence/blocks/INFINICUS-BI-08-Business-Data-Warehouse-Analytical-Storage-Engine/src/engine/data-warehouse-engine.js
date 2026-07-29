(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerDataset(input = {}) {
    const built =
      global.INFINICUS.BI
        .warehouseDatasetModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .warehouseStore
        .put("datasets", built.data);

    if (stored.ok) {
      runtime.registerDataset(
        built.data.warehouseDatasetId,
        built.data,
        {
          datasetType:
            built.data.datasetType,
          grain:
            built.data.grain
        }
      );

      await runtime.emit(
        "bi.warehouse_dataset.registered",
        stored.data
      );
    }

    return stored;
  }

  async function load({
    warehouseDatasetId,
    warehouseHandoffId
  } = {}) {
    const dataset =
      await global.INFINICUS.BI
        .warehouseStore
        .get("datasets", warehouseDatasetId);

    if (!dataset.ok) return dataset;

    const handoff =
      await global.INFINICUS.BI
        .dataTransformationEngine
        .getWarehouseHandoff({
          warehouseHandoffId
        });

    if (!handoff.ok) return handoff;

    if (
      dataset.data.datasetContractId !==
      handoff.data.datasetContractId
    ) {
      return runtime.failure(
        "WAREHOUSE_CONTRACT_MISMATCH",
        "Warehouse dataset and handoff use different dataset contracts."
      );
    }

    const rawRecords =
      handoff.data.records.map(item => item.record);

    const grain =
      global.INFINICUS.BI
        .warehouseGrainValidator
        .validate(
          rawRecords,
          dataset.data.primaryKeyFields
        );

    if (!grain.valid) {
      return runtime.failure(
        "WAREHOUSE_GRAIN_VIOLATION",
        "Duplicate grain keys were detected.",
        grain
      );
    }

    if (dataset.data.loadMode === "replace") {
      await global.INFINICUS.BI
        .warehouseStore
        .clearRowsByDataset(warehouseDatasetId);
    }

    const existing =
      await global.INFINICUS.BI
        .warehouseStore
        .rowsByDataset(warehouseDatasetId);

    if (!existing.ok) return existing;

    const existingByKey = new Map();

    for (const row of existing.data) {
      const key =
        global.INFINICUS.BI
          .warehouseGrainValidator
          .buildKey(
            row.record,
            dataset.data.primaryKeyFields
          );

      existingByKey.set(key, row);
    }

    const plan =
      global.INFINICUS.BI
        .warehouseLoadPlanner
        .plan({
          dataset: dataset.data,
          records: rawRecords
        });

    let inserted = 0;
    let updated = 0;

    for (const partition of plan.partitions) {
      for (const record of partition.rows) {
        const key =
          global.INFINICUS.BI
            .warehouseGrainValidator
            .buildKey(
              record,
              dataset.data.primaryKeyFields
            );

        const existingRow =
          existingByKey.get(key);

        const row = {
          warehouseRowId:
            existingRow?.warehouseRowId ||
            runtime.createId("bi_warehouse_row"),
          warehouseDatasetId,
          warehouseLoadId: null,
          partitionKey:
            partition.partitionKey,
          grainKey: key,
          record:
            runtime.clone(record),
          version:
            Number(existingRow?.version || 0) + 1,
          loadedAt:
            new Date().toISOString()
        };

        if (
          dataset.data.loadMode === "append" &&
          existingRow
        ) {
          continue;
        }

        if (
          dataset.data.loadMode === "upsert" &&
          existingRow
        ) {
          updated += 1;
        } else {
          inserted += 1;
        }

        await global.INFINICUS.BI
          .warehouseStore
          .put("rows", row);
      }
    }

    const loadRecord = {
      warehouseLoadId:
        runtime.createId("bi_warehouse_load"),
      warehouseDatasetId,
      warehouseHandoffId,
      transformationRunId:
        handoff.data.transformationRunId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      loadMode:
        dataset.data.loadMode,
      partitions:
        plan.partitions.map(partition => ({
          partitionKey:
            partition.partitionKey,
          rowCount:
            partition.rows.length
        })),
      counts: {
        received:
          rawRecords.length,
        inserted,
        updated,
        skipped:
          rawRecords.length - inserted - updated
      },
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .warehouseStore
      .put("loads", loadRecord);

    const rows =
      await global.INFINICUS.BI
        .warehouseStore
        .rowsByDataset(warehouseDatasetId);

    const snapshot = {
      warehouseSnapshotId:
        runtime.createId("bi_warehouse_snapshot"),
      warehouseDatasetId,
      warehouseLoadId:
        loadRecord.warehouseLoadId,
      rowCount:
        rows.ok ? rows.data.length : 0,
      version:
        dataset.data.version,
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .warehouseStore
      .put("snapshots", snapshot);

    const metricHandoff = {
      metricHandoffId:
        runtime.createId("bi_metric_handoff"),
      targetBlock: "BI-09",
      warehouseDatasetId,
      warehouseLoadId:
        loadRecord.warehouseLoadId,
      warehouseSnapshotId:
        snapshot.warehouseSnapshotId,
      datasetContractId:
        loadRecord.datasetContractId,
      datasetType:
        dataset.data.datasetType,
      grain:
        dataset.data.grain,
      primaryKeyFields:
        [...dataset.data.primaryKeyFields],
      partitionFields:
        [...dataset.data.partitionFields],
      rowCount:
        snapshot.rowCount,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .warehouseStore
      .put("metric_handoffs", metricHandoff);

    await runtime.emit(
      "bi.warehouse_load.completed",
      {
        loadRecord,
        metricHandoffId:
          metricHandoff.metricHandoffId
      }
    );

    return runtime.success({
      loadRecord,
      snapshot,
      metricHandoff
    });
  }

  async function query({
    warehouseDatasetId,
    filter = {},
    limit = 100
  } = {}) {
    const rows =
      await global.INFINICUS.BI
        .warehouseStore
        .rowsByDataset(warehouseDatasetId);

    if (!rows.ok) return rows;

    const filtered =
      rows.data
        .filter(row =>
          Object.entries(filter).every(
            ([field, value]) =>
              row.record[field] === value
          )
        )
        .slice(0, Math.max(1, Number(limit || 100)));

    return runtime.success(filtered);
  }

  const api = Object.freeze({
    registerDataset,
    load,
    query,
    getDataset: ({ warehouseDatasetId }) =>
      global.INFINICUS.BI
        .warehouseStore
        .get("datasets", warehouseDatasetId),
    getLoad: ({ warehouseLoadId }) =>
      global.INFINICUS.BI
        .warehouseStore
        .get("loads", warehouseLoadId),
    getMetricHandoff: ({ metricHandoffId }) =>
      global.INFINICUS.BI
        .warehouseStore
        .get("metric_handoffs", metricHandoffId),
    listSnapshots: () =>
      global.INFINICUS.BI
        .warehouseStore
        .list("snapshots")
  });

  runtime.registerService(
    "bi.data_warehouse",
    api,
    { block: "BI-08" }
  );

  runtime.registerRoute(
    "bi.warehouse_dataset.register",
    registerDataset
  );

  runtime.registerRoute(
    "bi.warehouse.load",
    load
  );

  runtime.registerRoute(
    "bi.warehouse.query",
    query
  );

  global.INFINICUS.BI.dataWarehouseEngine = api;
})(window);
