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

    const fields =
      new Set(
        contract.data.mappings
          .map(mapping => mapping.targetField)
      );

    const unknown =
      (input.fields || [])
        .map(field => field.field)
        .filter(field => !fields.has(field));

    if (unknown.length) {
      return runtime.failure(
        "MATCH_FIELDS_NOT_FOUND",
        "Match fields are not present in the dataset contract.",
        { unknown }
      );
    }

    const built =
      global.INFINICUS.BI
        .matchRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .resolutionStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.match_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    resolutionHandoffId,
    matchRuleId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .dataCleaningEngine
        .getResolutionHandoff({
          resolutionHandoffId
        });

    if (!handoff.ok) return handoff;

    const rule =
      await global.INFINICUS.BI
        .resolutionStore
        .get("rules", matchRuleId);

    if (!rule.ok) return rule;

    if (
      rule.data.datasetContractId !==
      handoff.data.datasetContractId
    ) {
      return runtime.failure(
        "MATCH_RULE_CONTRACT_MISMATCH",
        "Match rule does not belong to the handoff dataset contract."
      );
    }

    const pairs =
      global.INFINICUS.BI
        .matchCandidateGenerator
        .generate(
          handoff.data.records,
          rule.data.blockingFields
        );

    const automaticMatches = [];
    const reviewMatches = [];
    const rejectedMatches = [];

    for (const pair of pairs) {
      const match =
        global.INFINICUS.BI
          .entityMatchScorer
          .score(
            pair.left.record,
            pair.right.record,
            rule.data
          );

      const decision = {
        matchDecisionId:
          runtime.createId("bi_match_decision"),
        resolutionHandoffId,
        matchRuleId,
        leftCleanedRecordId:
          pair.left.cleanedRecordId,
        rightCleanedRecordId:
          pair.right.cleanedRecordId,
        score:
          match.score,
        classification:
          match.classification,
        fieldScores:
          match.fieldScores,
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.BI
        .resolutionStore
        .put("match_decisions", decision);

      if (
        match.classification ===
        "automatic_match"
      ) {
        automaticMatches.push({
          pair,
          decision
        });
      } else if (
        match.classification ===
        "manual_review"
      ) {
        reviewMatches.push({
          pair,
          decision
        });
      } else {
        rejectedMatches.push({
          pair,
          decision
        });
      }
    }

    const clusters = automaticMatches.map(item => {
      const leftId =
        item.pair.left.cleanedRecordId;

      const rightId =
        item.pair.right.cleanedRecordId;

      return {
        entityClusterId:
          runtime.createId("bi_entity_cluster"),
        entityType:
          rule.data.entityType,
        matchRuleId,
        recordIds:
          [leftId, rightId],
        canonicalRecordId:
          leftId,
        confidence:
          item.decision.score,
        status: "automatic_match",
        createdAt:
          new Date().toISOString()
      };
    });

    for (const cluster of clusters) {
      await global.INFINICUS.BI
        .resolutionStore
        .put("clusters", cluster);
    }

    const reviewQueue = reviewMatches.map(item => ({
      reviewItemId:
        runtime.createId("bi_match_review"),
      resolutionHandoffId,
      matchRuleId,
      leftCleanedRecordId:
        item.pair.left.cleanedRecordId,
      rightCleanedRecordId:
        item.pair.right.cleanedRecordId,
      score:
        item.decision.score,
      fieldScores:
        item.decision.fieldScores,
      status: "pending_review",
      createdAt:
        new Date().toISOString()
    }));

    for (const reviewItem of reviewQueue) {
      await global.INFINICUS.BI
        .resolutionStore
        .put("review_queue", reviewItem);
    }

    const mergePlans = clusters.map(cluster => ({
      mergePlanId:
        runtime.createId("bi_merge_plan"),
      entityClusterId:
        cluster.entityClusterId,
      canonicalRecordId:
        cluster.canonicalRecordId,
      sourceRecordIds:
        [...cluster.recordIds],
      strategy:
        "preserve_canonical_fill_missing",
      status:
        "prepared",
      createdAt:
        new Date().toISOString()
    }));

    for (const plan of mergePlans) {
      await global.INFINICUS.BI
        .resolutionStore
        .put("merge_plans", plan);
    }

    const resolutionRun = {
      resolutionRunId:
        runtime.createId("bi_resolution_run"),
      resolutionHandoffId,
      matchRuleId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        records:
          handoff.data.records.length,
        candidatePairs:
          pairs.length,
        automaticMatches:
          automaticMatches.length,
        manualReview:
          reviewMatches.length,
        noMatch:
          rejectedMatches.length,
        clusters:
          clusters.length
      },
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .resolutionStore
      .put("resolution_runs", resolutionRun);

    const transformationHandoff = {
      transformationHandoffId:
        runtime.createId("bi_transformation_handoff"),
      targetBlock: "BI-07",
      resolutionRunId:
        resolutionRun.resolutionRunId,
      datasetContractId:
        resolutionRun.datasetContractId,
      correlationId:
        resolutionRun.correlationId,
      records:
        handoff.data.records.map(runtime.clone),
      clusters:
        clusters.map(runtime.clone),
      mergePlans:
        mergePlans.map(runtime.clone),
      reviewQueue:
        reviewQueue.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .resolutionStore
      .put(
        "transformation_handoffs",
        transformationHandoff
      );

    await runtime.emit(
      "bi.entity_resolution.completed",
      {
        resolutionRun,
        transformationHandoffId:
          transformationHandoff
            .transformationHandoffId
      }
    );

    return runtime.success({
      resolutionRun,
      transformationHandoff,
      automaticMatches,
      reviewMatches,
      rejectedMatches
    });
  }

  const api = Object.freeze({
    registerRule,
    execute,
    getResolutionRun: ({ resolutionRunId }) =>
      global.INFINICUS.BI
        .resolutionStore
        .get("resolution_runs", resolutionRunId),
    getTransformationHandoff: ({ transformationHandoffId }) =>
      global.INFINICUS.BI
        .resolutionStore
        .get(
          "transformation_handoffs",
          transformationHandoffId
        ),
    listReviewQueue: () =>
      global.INFINICUS.BI
        .resolutionStore
        .list("review_queue"),
    listClusters: () =>
      global.INFINICUS.BI
        .resolutionStore
        .list("clusters")
  });

  runtime.registerService(
    "bi.entity_resolution",
    api,
    { block: "BI-06" }
  );

  runtime.registerRoute(
    "bi.match_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.entity_resolution.execute",
    execute
  );

  global.INFINICUS.BI.entityResolutionEngine = api;
})(window);
