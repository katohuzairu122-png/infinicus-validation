(function (global) {
  "use strict";

  const REPORT_TYPES = Object.freeze([
    "executive",
    "operational",
    "financial",
    "sales",
    "customer",
    "marketing",
    "inventory",
    "workforce",
    "market",
    "investigation"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const reportType =
      String(input.reportType || "executive");

    if (
      !input.name ||
      !REPORT_TYPES.includes(reportType)
    ) {
      return runtime.failure(
        "REPORT_DEFINITION_INVALID",
        "name and a supported reportType are required."
      );
    }

    return runtime.success({
      reportId:
        input.reportId ||
        runtime.createId("bi_report"),
      name:
        String(input.name),
      reportType,
      description:
        String(input.description || ""),
      sections:
        runtime.clone(input.sections || []),
      filters:
        runtime.clone(input.filters || []),
      audience:
        String(input.audience || "management"),
      exportFormats:
        Array.isArray(input.exportFormats)
          ? input.exportFormats.map(String)
          : ["json"],
      status:
        String(input.status || "draft"),
      version:
        Math.max(1, Number(input.version || 1)),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.reportDefinitionModel =
    Object.freeze({
      REPORT_TYPES,
      create
    });
})(window);
