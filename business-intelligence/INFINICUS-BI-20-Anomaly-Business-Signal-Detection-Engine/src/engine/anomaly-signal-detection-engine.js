(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const built =
      global.INFINICUS.BI
        .detectionRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .anomalyStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.detection_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function detect({
    anomalyHandoffId,
    statisticalInputs = [],
    contradictionInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .trendVarianceBenchmarkEngine
        .getAnomalyHandoff({
          anomalyHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .anomalyStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data.filter(rule =>
        rule.status === "active"
      );

    const candidateSignals = [];

    for (const rule of rules) {
      const contexts = [];

      if (rule.method === "z_score") {
        contexts.push(
          ...statisticalInputs
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "sudden_change") {
        contexts.push(
          ...handoff.data.trends
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "variance_severity") {
        contexts.push(
          ...handoff.data.variances
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "benchmark_breach") {
        contexts.push(
          ...handoff.data.benchmarks
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "domain_contradiction") {
        contexts.push(...contradictionInputs);
      }

      for (const context of contexts) {
        const outcome =
          global.INFINICUS.BI
            .detectionRuleEvaluator
            .evaluate(rule, context);

        if (!outcome.detected) continue;

        const code =
          `${rule.method.toUpperCase()}_${String(
            context.metricCode ||
            rule.metricCode ||
            "BUSINESS_SIGNAL"
          ).toUpperCase()}`;

        const priorityScore =
          global.INFINICUS.BI
            .signalPrioritizer
            .score(
              rule.severity,
              outcome.confidence
            );

        candidateSignals.push({
          businessSignalId:
            runtime.createId("bi_business_signal"),
          detectionRuleId:
            rule.detectionRuleId,
          anomalyHandoffId,
          sourceBlock:
            rule.sourceBlock ||
            context.sourceBlock ||
            "BI-19",
          metricCode:
            context.metricCode ||
            rule.metricCode ||
            null,
          code,
          severity:
            rule.severity,
          confidence:
            Number(outcome.confidence.toFixed(4)),
          priorityScore,
          evidence:
            runtime.clone(outcome.evidence),
          status: "open",
          detectedAt:
            new Date().toISOString()
        });
      }
    }

    const prioritized =
      global.INFINICUS.BI
        .signalPrioritizer
        .prioritize(candidateSignals);

    for (const signal of prioritized) {
      await global.INFINICUS.BI
        .anomalyStore
        .put("signals", signal);
    }

    const investigationQueue =
      prioritized.map((signal, index) => ({
        investigationItemId:
          runtime.createId("bi_investigation"),
        businessSignalId:
          signal.businessSignalId,
        priority:
          index + 1,
        severity:
          signal.severity,
        confidence:
          signal.confidence,
        priorityScore:
          signal.priorityScore,
        status:
          "pending_investigation",
        createdAt:
          new Date().toISOString()
      }));

    for (const item of investigationQueue) {
      await global.INFINICUS.BI
        .anomalyStore
        .put("investigation_queue", item);
    }

    const detectionRun = {
      detectionRunId:
        runtime.createId("bi_detection_run"),
      anomalyHandoffId,
      analysisRunId:
        handoff.data.analysisRunId,
      correlationId:
        handoff.data.correlationId,
      ruleCount:
        rules.length,
      candidateSignalCount:
        candidateSignals.length,
      prioritizedSignalCount:
        prioritized.length,
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .anomalyStore
      .put("detection_runs", detectionRun);

    const rootCauseHandoff = {
      rootCauseHandoffId:
        runtime.createId("bi_root_cause_handoff"),
      targetBlock: "BI-21",
      detectionRunId:
        detectionRun.detectionRunId,
      analysisRunId:
        detectionRun.analysisRunId,
      correlationId:
        detectionRun.correlationId,
      signals:
        prioritized.map(runtime.clone),
      investigationQueue:
        investigationQueue.map(runtime.clone),
      domains:
        handoff.data.domains.map(runtime.clone),
      trends:
        handoff.data.trends.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      benchmarks:
        handoff.data.benchmarks.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .anomalyStore
      .put("root_cause_handoffs", rootCauseHandoff);

    await runtime.emit(
      "bi.anomaly_signal_detection.completed",
      {
        detectionRun,
        rootCauseHandoffId:
          rootCauseHandoff.rootCauseHandoffId
      }
    );

    return runtime.success({
      detectionRun,
      signals:
        prioritized,
      investigationQueue,
      rootCauseHandoff
    });
  }

  const api = Object.freeze({
    registerRule,
    detect,
    getDetectionRun: ({ detectionRunId }) =>
      global.INFINICUS.BI
        .anomalyStore
        .get("detection_runs", detectionRunId),
    getRootCauseHandoff: ({ rootCauseHandoffId }) =>
      global.INFINICUS.BI
        .anomalyStore
        .get("root_cause_handoffs", rootCauseHandoffId),
    listSignals: () =>
      global.INFINICUS.BI
        .anomalyStore
        .list("signals"),
    listInvestigationQueue: () =>
      global.INFINICUS.BI
        .anomalyStore
        .list("investigation_queue")
  });

  runtime.registerService(
    "bi.anomaly_signal_detection",
    api,
    { block: "BI-20" }
  );

  runtime.registerRoute(
    "bi.detection_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.anomaly_signal_detection.detect",
    detect
  );

  global.INFINICUS.BI.anomalySignalDetectionEngine = api;
})(window);
