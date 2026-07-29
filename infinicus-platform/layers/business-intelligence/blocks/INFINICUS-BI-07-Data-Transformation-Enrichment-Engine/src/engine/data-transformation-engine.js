(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const built =
      global.INFINICUS.BI
        .transformationRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .transformationStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.transformation_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    transformationHandoffId,
    lookups = {}
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .entityResolutionEngine
        .getTransformationHandoff({
          transformationHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .transformationStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data
        .filter(rule =>
          rule.datasetContractId ===
            handoff.data.datasetContractId &&
          rule.status === "active"
        )
        .sort((a, b) => a.sequence - b.sequence);

    const merged =
      global.INFINICUS.BI
        .mergePlanApplier
        .mergeRecords(
          handoff.data.records,
          handoff.data.mergePlans
        );

    const transformedRecords = [];
    const failedRecords = [];

    for (const item of merged) {
      let current = runtime.clone(item.record);
      const lineage = [];
      const errors = [];

      for (const rule of rules) {
        try {
          const before = runtime.clone(current);
          current =
            global.INFINICUS.BI
              .transformationRuleApplier
              .apply(current, rule, { lookups });

          lineage.push({
            transformationRuleId:
              rule.transformationRuleId,
            ruleType:
              rule.ruleType,
            before,
            after:
              runtime.clone(current)
          });
        } catch (error) {
          errors.push({
            transformationRuleId:
              rule.transformationRuleId,
            ruleType:
              rule.ruleType,
            message:
              error?.message ||
              "Transformation failed."
          });
        }
      }

      const record = {
        transformedRecordId:
          runtime.createId("bi_transformed_record"),
        transformationHandoffId,
        datasetContractId:
          handoff.data.datasetContractId,
        sourceCleanedRecordId:
          item.cleanedRecordId,
        record:
          runtime.clone(current),
        lineage,
        errors,
        status:
          errors.length
            ? "failed"
            : "transformed",
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.BI
        .transformationStore
        .put("transformed_records", record);

      if (errors.length) {
        failedRecords.push(record);
      } else {
        transformedRecords.push(record);
      }
    }

    const transformationRun = {
      transformationRunId:
        runtime.createId("bi_transformation_run"),
      transformationHandoffId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        received:
          handoff.data.records.length,
        afterMerge:
          merged.length,
        transformed:
          transformedRecords.length,
        failed:
          failedRecords.length
      },
      status:
        failedRecords.length === merged.length &&
        merged.length > 0
          ? "failed"
          : "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .transformationStore
      .put("transformation_runs", transformationRun);

    const warehouseHandoff = {
      warehouseHandoffId:
        runtime.createId("bi_warehouse_handoff"),
      targetBlock: "BI-08",
      transformationRunId:
        transformationRun.transformationRunId,
      datasetContractId:
        transformationRun.datasetContractId,
      correlationId:
        transformationRun.correlationId,
      records:
        transformedRecords.map(record => ({
          transformedRecordId:
            record.transformedRecordId,
          record:
            runtime.clone(record.record),
          lineage:
            runtime.clone(record.lineage)
        })),
      failedRecords:
        failedRecords.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .transformationStore
      .put("warehouse_handoffs", warehouseHandoff);

    await runtime.emit(
      "bi.data_transformation.completed",
      {
        transformationRun,
        warehouseHandoffId:
          warehouseHandoff.warehouseHandoffId
      }
    );

    return runtime.success({
      transformationRun,
      warehouseHandoff,
      failedRecords
    });
  }

  const api = Object.freeze({
    registerRule,
    execute,
    getTransformationRun: ({ transformationRunId }) =>
      global.INFINICUS.BI
        .transformationStore
        .get("transformation_runs", transformationRunId),
    getWarehouseHandoff: ({ warehouseHandoffId }) =>
      global.INFINICUS.BI
        .transformationStore
        .get("warehouse_handoffs", warehouseHandoffId),
    listTransformedRecords: () =>
      global.INFINICUS.BI
        .transformationStore
        .list("transformed_records")
  });

  runtime.registerService(
    "bi.data_transformation",
    api,
    { block: "BI-07" }
  );

  runtime.registerRoute(
    "bi.transformation_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.data_transformation.execute",
    execute
  );

  global.INFINICUS.BI.dataTransformationEngine = api;
})(window);
