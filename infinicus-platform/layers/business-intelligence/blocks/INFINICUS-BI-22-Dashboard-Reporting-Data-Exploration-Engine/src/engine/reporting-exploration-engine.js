(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerDashboard(input = {}) {
    const built =
      global.INFINICUS.BI
        .dashboardDefinitionModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .reportingStore
        .put("dashboards", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.dashboard.registered",
        stored.data
      );
    }

    return stored;
  }

  async function registerReport(input = {}) {
    const built =
      global.INFINICUS.BI
        .reportDefinitionModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .reportingStore
        .put("reports", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.report.registered",
        stored.data
      );
    }

    return stored;
  }

  async function renderDashboard({
    dashboardId,
    context = {}
  } = {}) {
    const dashboard =
      await global.INFINICUS.BI
        .reportingStore
        .get("dashboards", dashboardId);

    if (!dashboard.ok) return dashboard;

    const renderedWidgets =
      dashboard.data.widgets.map(widget =>
        global.INFINICUS.BI
          .reportingWidgetRenderer
          .render(widget, context)
      );

    return runtime.success({
      dashboardId,
      name:
        dashboard.data.name,
      filters:
        runtime.clone(dashboard.data.filters),
      drillPaths:
        runtime.clone(dashboard.data.drillPaths),
      widgets:
        renderedWidgets,
      renderedAt:
        new Date().toISOString()
    });
  }

  async function generateReport({
    reportId,
    reportingHandoffId,
    explorationRows = []
  } = {}) {
    const report =
      await global.INFINICUS.BI
        .reportingStore
        .get("reports", reportId);

    if (!report.ok) return report;

    const handoff =
      await global.INFINICUS.BI
        .rootCauseDriverAnalysisEngine
        .getReportingHandoff({
          reportingHandoffId
        });

    if (!handoff.ok) return handoff;

    const summary =
      global.INFINICUS.BI
        .executiveSummaryBuilder
        .build(handoff.data);

    const explorationDataset =
      global.INFINICUS.BI
        .explorationDatasetPublisher
        .publish(
          { rows: explorationRows },
          []
        );

    await global.INFINICUS.BI
      .reportingStore
      .put(
        "exploration_datasets",
        explorationDataset
      );

    const reportSnapshot = {
      reportSnapshotId:
        runtime.createId("bi_report_snapshot"),
      reportId,
      reportingHandoffId,
      rootCauseAnalysisId:
        handoff.data.rootCauseAnalysisId,
      correlationId:
        handoff.data.correlationId,
      reportType:
        report.data.reportType,
      title:
        report.data.name,
      summary,
      sections:
        runtime.clone(report.data.sections),
      signal:
        runtime.clone(handoff.data.signal),
      rankedDrivers:
        handoff.data.rankedDrivers.map(runtime.clone),
      causeGraph:
        runtime.clone(handoff.data.causeGraph),
      unresolvedHypotheses:
        handoff.data.unresolvedHypotheses.map(runtime.clone),
      explorationDatasetId:
        explorationDataset.explorationDatasetId,
      status: "generated",
      generatedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .reportingStore
      .put("snapshots", reportSnapshot);

    const distributionHandoff = {
      distributionHandoffId:
        runtime.createId("bi_distribution_handoff"),
      targetBlock: "BI-23",
      reportSnapshotId:
        reportSnapshot.reportSnapshotId,
      reportId,
      correlationId:
        reportSnapshot.correlationId,
      title:
        reportSnapshot.title,
      summary:
        runtime.clone(reportSnapshot.summary),
      severity:
        reportSnapshot.signal?.severity || "information",
      audience:
        report.data.audience,
      exportFormats:
        [...report.data.exportFormats],
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .reportingStore
      .put(
        "distribution_handoffs",
        distributionHandoff
      );

    await runtime.emit(
      "bi.report.generated",
      {
        reportSnapshot,
        distributionHandoffId:
          distributionHandoff.distributionHandoffId
      }
    );

    return runtime.success({
      reportSnapshot,
      explorationDataset,
      distributionHandoff
    });
  }

  const api = Object.freeze({
    registerDashboard,
    registerReport,
    renderDashboard,
    generateReport,
    getReportSnapshot: ({ reportSnapshotId }) =>
      global.INFINICUS.BI
        .reportingStore
        .get("snapshots", reportSnapshotId),
    getDistributionHandoff: ({ distributionHandoffId }) =>
      global.INFINICUS.BI
        .reportingStore
        .get(
          "distribution_handoffs",
          distributionHandoffId
        ),
    getExplorationDataset: ({ explorationDatasetId }) =>
      global.INFINICUS.BI
        .reportingStore
        .get(
          "exploration_datasets",
          explorationDatasetId
        )
  });

  runtime.registerService(
    "bi.reporting_exploration",
    api,
    { block: "BI-22" }
  );

  runtime.registerRoute(
    "bi.dashboard.register",
    registerDashboard
  );

  runtime.registerRoute(
    "bi.report.register",
    registerReport
  );

  runtime.registerRoute(
    "bi.dashboard.render",
    renderDashboard
  );

  runtime.registerRoute(
    "bi.report.generate",
    generateReport
  );

  global.INFINICUS.BI.reportingExplorationEngine = api;
})(window);
