(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.businessSignalId || !input.problemStatement) {
      return runtime.failure(
        "INVESTIGATION_CASE_INVALID",
        "businessSignalId and problemStatement are required."
      );
    }

    return runtime.success({
      investigationCaseId:
        input.investigationCaseId ||
        runtime.createId("bi_investigation_case"),
      businessSignalId:
        String(input.businessSignalId),
      problemStatement:
        String(input.problemStatement),
      scope:
        runtime.clone(input.scope || {}),
      assumptions:
        runtime.clone(input.assumptions || []),
      confounders:
        runtime.clone(input.confounders || []),
      status:
        String(input.status || "open"),
      owner:
        String(input.owner || ""),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.investigationCaseModel =
    Object.freeze({ create });
})(window);
