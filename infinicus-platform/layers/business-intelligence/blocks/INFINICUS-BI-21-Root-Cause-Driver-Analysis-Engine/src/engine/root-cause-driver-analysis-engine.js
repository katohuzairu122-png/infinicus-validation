(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function createCase(input = {}) {
    const built =
      global.INFINICUS.BI
        .investigationCaseModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .rootCauseStore
        .put("cases", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.investigation_case.created",
        stored.data
      );
    }

    return stored;
  }

  async function registerDriver(input = {}) {
    const investigation =
      await global.INFINICUS.BI
        .rootCauseStore
        .get(
          "cases",
          input.investigationCaseId
        );

    if (!investigation.ok) {
      return investigation;
    }

    const built =
      global.INFINICUS.BI
        .driverCandidateModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .rootCauseStore
        .put("drivers", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.driver_candidate.registered",
        stored.data
      );
    }

    return stored;
  }

  async function analyze({
    rootCauseHandoffId,
    investigationCaseId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .anomalySignalDetectionEngine
        .getRootCauseHandoff({
          rootCauseHandoffId
        });

    if (!handoff.ok) return handoff;

    const investigation =
      await global.INFINICUS.BI
        .rootCauseStore
        .get(
          "cases",
          investigationCaseId
        );

    if (!investigation.ok) {
      return investigation;
    }

    const allDrivers =
      await global.INFINICUS.BI
        .rootCauseStore
        .list("drivers");

    if (!allDrivers.ok) return allDrivers;

    const drivers =
      allDrivers.data.filter(driver =>
        driver.investigationCaseId ===
        investigationCaseId
      );

    const signal =
      handoff.data.signals.find(item =>
        item.businessSignalId ===
        investigation.data.businessSignalId
      );

    if (!signal) {
      return runtime.failure(
        "INVESTIGATION_SIGNAL_NOT_FOUND",
        "The investigation signal was not found in the BI-20 handoff."
      );
    }

    const ranked =
      global.INFINICUS.BI
        .rootCauseDriverRanker
        .rank(drivers);

    const causeGraph =
      global.INFINICUS.BI
        .rootCauseGraphBuilder
        .build(signal, ranked);

    const confirmed =
      ranked.filter(driver =>
        driver.confidence >= 0.75
      );

    const probable =
      ranked.filter(driver =>
        driver.confidence >= 0.5 &&
        driver.confidence < 0.75
      );

    const unresolved =
      ranked.filter(driver =>
        driver.confidence < 0.5
      );

    const unresolvedRecords = [];

    for (const driver of unresolved) {
      const item = {
        unresolvedHypothesisId:
          runtime.createId("bi_unresolved_hypothesis"),
        investigationCaseId,
        driverCandidateId:
          driver.driverCandidateId,
        name:
          driver.name,
        confidence:
          driver.confidence,
        status:
          "additional_evidence_required",
        createdAt:
          new Date().toISOString()
      };

      unresolvedRecords.push(item);

      await global.INFINICUS.BI
        .rootCauseStore
        .put("unresolved", item);
    }

    const rootCauseAnalysis = {
      rootCauseAnalysisId:
        runtime.createId("bi_root_cause_analysis"),
      rootCauseHandoffId,
      investigationCaseId,
      businessSignalId:
        signal.businessSignalId,
      correlationId:
        handoff.data.correlationId,
      signal:
        runtime.clone(signal),
      confirmedDrivers:
        confirmed.map(runtime.clone),
      probableDrivers:
        probable.map(runtime.clone),
      unresolvedDrivers:
        unresolved.map(runtime.clone),
      causeGraph:
        runtime.clone(causeGraph),
      confounders:
        runtime.clone(
          investigation.data.confounders
        ),
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .rootCauseStore
      .put(
        "analysis_runs",
        rootCauseAnalysis
      );

    const reportingHandoff = {
      reportingHandoffId:
        runtime.createId("bi_reporting_handoff"),
      targetBlock: "BI-22",
      sourceBlock: "BI-21",
      rootCauseAnalysisId:
        rootCauseAnalysis.rootCauseAnalysisId,
      investigationCaseId,
      businessSignalId:
        signal.businessSignalId,
      correlationId:
        rootCauseAnalysis.correlationId,
      signal:
        runtime.clone(signal),
      rankedDrivers:
        ranked.map(runtime.clone),
      causeGraph:
        runtime.clone(causeGraph),
      unresolvedHypotheses:
        unresolvedRecords.map(runtime.clone),
      supportingContext: {
        domains:
          handoff.data.domains.map(runtime.clone),
        trends:
          handoff.data.trends.map(runtime.clone),
        variances:
          handoff.data.variances.map(runtime.clone),
        benchmarks:
          handoff.data.benchmarks.map(runtime.clone)
      },
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .rootCauseStore
      .put(
        "reporting_handoffs",
        reportingHandoff
      );

    await runtime.emit(
      "bi.root_cause_analysis.completed",
      {
        rootCauseAnalysis,
        reportingHandoffId:
          reportingHandoff.reportingHandoffId
      }
    );

    return runtime.success({
      rootCauseAnalysis,
      reportingHandoff
    });
  }

  const api = Object.freeze({
    createCase,
    registerDriver,
    analyze,
    getAnalysis: ({ rootCauseAnalysisId }) =>
      global.INFINICUS.BI
        .rootCauseStore
        .get(
          "analysis_runs",
          rootCauseAnalysisId
        ),
    getReportingHandoff: ({ reportingHandoffId }) =>
      global.INFINICUS.BI
        .rootCauseStore
        .get(
          "reporting_handoffs",
          reportingHandoffId
        ),
    listUnresolvedHypotheses: () =>
      global.INFINICUS.BI
        .rootCauseStore
        .list("unresolved")
  });

  runtime.registerService(
    "bi.root_cause_driver_analysis",
    api,
    { block: "BI-21" }
  );

  runtime.registerRoute(
    "bi.investigation_case.create",
    createCase
  );

  runtime.registerRoute(
    "bi.driver_candidate.register",
    registerDriver
  );

  runtime.registerRoute(
    "bi.root_cause_driver_analysis.analyze",
    analyze
  );

  global.INFINICUS.BI.rootCauseDriverAnalysisEngine = api;
})(window);
