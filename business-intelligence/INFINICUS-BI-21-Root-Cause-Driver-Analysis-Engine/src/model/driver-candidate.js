(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.investigationCaseId || !input.name) {
      return runtime.failure(
        "DRIVER_CANDIDATE_INVALID",
        "investigationCaseId and name are required."
      );
    }

    return runtime.success({
      driverCandidateId:
        input.driverCandidateId ||
        runtime.createId("bi_driver_candidate"),
      investigationCaseId:
        String(input.investigationCaseId),
      name:
        String(input.name),
      category:
        String(input.category || "unknown"),
      direction:
        String(input.direction || "unknown"),
      evidence:
        runtime.clone(input.evidence || []),
      counterEvidence:
        runtime.clone(input.counterEvidence || []),
      fiveWhys:
        runtime.clone(input.fiveWhys || []),
      status:
        String(input.status || "hypothesis"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.driverCandidateModel =
    Object.freeze({ create });
})(window);
