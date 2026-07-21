(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            input.datasetContractId
        });

    if (!contract.ok) return contract;

    const targetFields =
      contract.data.mappings
        .map(mapping => mapping.targetField);

    if (!targetFields.includes(input.field)) {
      return runtime.failure(
        "CLEANING_FIELD_NOT_FOUND",
        `Field is not present in the dataset contract: ${input.field}`
      );
    }

    const built =
      global.INFINICUS.BI
        .cleaningRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .cleaningStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.cleaning_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    cleaningHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .dataQualityEngine
        .getCleaningHandoff({
          cleaningHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .cleaningStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data.filter(rule =>
        rule.datasetContractId ===
          handoff.data.datasetContractId &&
        rule.status === "active"
      );

    const inputRecords = [
      ...handoff.data.acceptedRecords,
      ...handoff.data.warningRecords
    ];

    const cleanedRecords = [];
    const failedRecords = [];

    for (const item of inputRecords) {
      const cleaned =
        global.INFINICUS.BI
          .recordCleaner
          .clean(item.record, rules);

      const cleanedRecord = {
        cleanedRecordId:
          runtime.createId("bi_cleaned_record"),
        cleaningHandoffId,
        qualityRunId:
          handoff.data.qualityRunId,
        ingestionRunId:
          handoff.data.ingestionRunId,
        datasetContractId:
          handoff.data.datasetContractId,
        sourceIndex:
          item.sourceIndex,
        originalRecord:
          runtime.clone(item.record),
        cleanedRecord:
          runtime.clone(cleaned.record),
        changes:
          cleaned.changes.map(runtime.clone),
        errors:
          cleaned.errors.map(runtime.clone),
        status:
          cleaned.valid
            ? "cleaned"
            : "failed",
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.BI
        .cleaningStore
        .put(
          "cleaned_records",
          cleanedRecord
        );

      if (cleaned.valid) {
        cleanedRecords.push(cleanedRecord);
      } else {
        failedRecords.push(cleanedRecord);
      }
    }

    const manualRemediation = [];

    for (const quarantined of
      handoff.data.quarantinedRecords) {
      const remediation = {
        remediationId:
          runtime.createId("bi_remediation"),
        cleaningHandoffId,
        datasetContractId:
          handoff.data.datasetContractId,
        quarantineRecordId:
          quarantined.quarantineRecordId,
        record:
          runtime.clone(quarantined.record),
        issues:
          quarantined.issues.map(runtime.clone),
        status: "manual_review_required",
        createdAt:
          new Date().toISOString()
      };

      manualRemediation.push(remediation);

      await global.INFINICUS.BI
        .cleaningStore
        .put(
          "manual_remediation",
          remediation
        );
    }

    const cleaningRun = {
      cleaningRunId:
        runtime.createId("bi_cleaning_run"),
      cleaningHandoffId,
      qualityRunId:
        handoff.data.qualityRunId,
      ingestionRunId:
        handoff.data.ingestionRunId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        received:
          inputRecords.length,
        cleaned:
          cleanedRecords.length,
        failed:
          failedRecords.length,
        manualRemediation:
          manualRemediation.length
      },
      status:
        failedRecords.length === inputRecords.length &&
        inputRecords.length > 0
          ? "failed"
          : "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .cleaningStore
      .put("cleaning_runs", cleaningRun);

    const resolutionHandoff = {
      resolutionHandoffId:
        runtime.createId("bi_resolution_handoff"),
      targetBlock: "BI-06",
      cleaningRunId:
        cleaningRun.cleaningRunId,
      datasetContractId:
        cleaningRun.datasetContractId,
      correlationId:
        cleaningRun.correlationId,
      records:
        cleanedRecords.map(record => ({
          cleanedRecordId:
            record.cleanedRecordId,
          sourceIndex:
            record.sourceIndex,
          record:
            runtime.clone(record.cleanedRecord),
          changes:
            record.changes.map(runtime.clone)
        })),
      manualRemediation:
        manualRemediation.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .cleaningStore
      .put(
        "resolution_handoffs",
        resolutionHandoff
      );

    await runtime.emit(
      "bi.data_cleaning.completed",
      {
        cleaningRun,
        resolutionHandoffId:
          resolutionHandoff.resolutionHandoffId
      }
    );

    return runtime.success({
      cleaningRun,
      resolutionHandoff,
      failedRecords
    });
  }

  const api = Object.freeze({
    registerRule,
    execute,
    getCleaningRun: ({ cleaningRunId }) =>
      global.INFINICUS.BI
        .cleaningStore
        .get("cleaning_runs", cleaningRunId),
    getResolutionHandoff: ({ resolutionHandoffId }) =>
      global.INFINICUS.BI
        .cleaningStore
        .get(
          "resolution_handoffs",
          resolutionHandoffId
        ),
    listCleanedRecords: () =>
      global.INFINICUS.BI
        .cleaningStore
        .list("cleaned_records"),
    listManualRemediation: () =>
      global.INFINICUS.BI
        .cleaningStore
        .list("manual_remediation")
  });

  runtime.registerService(
    "bi.data_cleaning",
    api,
    { block: "BI-05" }
  );

  runtime.registerRoute(
    "bi.cleaning_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.data_cleaning.execute",
    execute
  );

  global.INFINICUS.BI.dataCleaningEngine = api;
})(window);
