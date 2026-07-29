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
        "QUALITY_FIELD_NOT_FOUND",
        `Field is not present in the dataset contract: ${input.field}`
      );
    }

    const built =
      global.INFINICUS.BI
        .qualityRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .qualityStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.quality_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function evaluateHandoff({
    qualityHandoffId,
    references = {}
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .dataIngestionEngine
        .getQualityHandoff({
          qualityHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .qualityStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data.filter(rule =>
        rule.datasetContractId ===
          handoff.data.datasetContractId &&
        rule.status === "active"
      );

    const seenValues = new Map();
    const referenceMap = new Map(
      Object.entries(references).map(
        ([field, values]) =>
          [field, new Set(values)]
      )
    );

    const acceptedRecords = [];
    const warningRecords = [];
    const quarantinedRecords = [];
    const issues = [];

    for (const item of handoff.data.records) {
      const recordIssues = [];

      for (const rule of rules) {
        const outcome =
          global.INFINICUS.BI
            .qualityRuleEvaluator
            .evaluate({
              rule,
              record: item.record,
              context: {
                seenValues,
                references: referenceMap
              }
            });

        if (!outcome.passed) {
          recordIssues.push(outcome);
        }
      }

      for (const rule of rules.filter(
        rule => rule.ruleType === "unique"
      )) {
        if (!seenValues.has(rule.field)) {
          seenValues.set(rule.field, new Set());
        }

        const value = item.record[rule.field];

        if (value != null) {
          seenValues.get(rule.field).add(value);
        }
      }

      const errors =
        recordIssues.filter(issue =>
          issue.severity === "error"
        );

      const warnings =
        recordIssues.filter(issue =>
          issue.severity !== "error"
        );

      for (const issue of recordIssues) {
        const issueRecord = {
          qualityIssueId:
            runtime.createId("bi_quality_issue"),
          qualityHandoffId,
          ingestionRunId:
            handoff.data.ingestionRunId,
          datasetContractId:
            handoff.data.datasetContractId,
          sourceIndex:
            item.sourceIndex,
          ...runtime.clone(issue),
          status: "open",
          createdAt:
            new Date().toISOString()
        };

        issues.push(issueRecord);

        await global.INFINICUS.BI
          .qualityStore
          .put("issues", issueRecord);
      }

      if (errors.length) {
        const quarantine = {
          quarantineRecordId:
            runtime.createId("bi_quarantine"),
          qualityHandoffId,
          ingestionRunId:
            handoff.data.ingestionRunId,
          datasetContractId:
            handoff.data.datasetContractId,
          sourceIndex:
            item.sourceIndex,
          record:
            runtime.clone(item.record),
          issues:
            errors.map(runtime.clone),
          status: "quarantined",
          createdAt:
            new Date().toISOString()
        };

        quarantinedRecords.push(quarantine);

        await global.INFINICUS.BI
          .qualityStore
          .put("quarantine", quarantine);
      } else {
        acceptedRecords.push(
          runtime.clone(item)
        );

        if (warnings.length) {
          warningRecords.push({
            ...runtime.clone(item),
            warnings:
              warnings.map(runtime.clone)
          });
        }
      }
    }

    const warningCount =
      issues.filter(issue =>
        issue.severity !== "error"
      ).length;

    const errorCount =
      issues.filter(issue =>
        issue.severity === "error"
      ).length;

    const qualityScore =
      global.INFINICUS.BI
        .qualityScorer
        .score({
          totalRecords:
            handoff.data.records.length,
          acceptedRecords:
            acceptedRecords.length,
          warningCount,
          errorCount
        });

    const qualityRun = {
      qualityRunId:
        runtime.createId("bi_quality_run"),
      qualityHandoffId,
      ingestionRunId:
        handoff.data.ingestionRunId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        evaluated:
          handoff.data.records.length,
        accepted:
          acceptedRecords.length,
        warningRecords:
          warningRecords.length,
        quarantined:
          quarantinedRecords.length,
        issues:
          issues.length
      },
      qualityScore,
      status:
        qualityScore.level === "critical"
          ? "failed"
          : "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .qualityStore
      .put("quality_runs", qualityRun);

    const cleaningHandoff = {
      cleaningHandoffId:
        runtime.createId("bi_cleaning_handoff"),
      targetBlock: "BI-05",
      qualityRunId:
        qualityRun.qualityRunId,
      ingestionRunId:
        qualityRun.ingestionRunId,
      datasetContractId:
        qualityRun.datasetContractId,
      correlationId:
        qualityRun.correlationId,
      acceptedRecords:
        acceptedRecords.map(runtime.clone),
      warningRecords:
        warningRecords.map(runtime.clone),
      quarantinedRecords:
        quarantinedRecords.map(runtime.clone),
      qualityScore:
        runtime.clone(qualityScore),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .qualityStore
      .put(
        "cleaning_handoffs",
        cleaningHandoff
      );

    await runtime.emit(
      "bi.data_quality.completed",
      {
        qualityRun,
        cleaningHandoffId:
          cleaningHandoff.cleaningHandoffId
      }
    );

    return runtime.success({
      qualityRun,
      cleaningHandoff,
      issues
    });
  }

  const api = Object.freeze({
    registerRule,
    evaluateHandoff,
    getQualityRun: ({ qualityRunId }) =>
      global.INFINICUS.BI
        .qualityStore
        .get("quality_runs", qualityRunId),
    getCleaningHandoff: ({ cleaningHandoffId }) =>
      global.INFINICUS.BI
        .qualityStore
        .get(
          "cleaning_handoffs",
          cleaningHandoffId
        ),
    listIssues: () =>
      global.INFINICUS.BI
        .qualityStore
        .list("issues"),
    listQuarantine: () =>
      global.INFINICUS.BI
        .qualityStore
        .list("quarantine")
  });

  runtime.registerService(
    "bi.data_quality",
    api,
    { block: "BI-04" }
  );

  runtime.registerRoute(
    "bi.quality_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.data_quality.evaluate",
    evaluateHandoff
  );

  global.INFINICUS.BI.dataQualityEngine = api;
})(window);
