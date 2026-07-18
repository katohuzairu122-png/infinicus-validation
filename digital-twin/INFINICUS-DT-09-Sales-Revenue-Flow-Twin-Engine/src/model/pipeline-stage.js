(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.twinId || !input.name || !input.code) {
      return runtime.failure(
        "PIPELINE_STAGE_INVALID",
        "twinId, name, and code are required."
      );
    }

    return runtime.success({
      pipelineStageId:
        input.pipelineStageId ||
        runtime.createId("dt_pipeline_stage"),
      twinId: String(input.twinId),
      name: String(input.name),
      code: String(input.code)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      order: Math.max(1, Number(input.order || 1)),
      probabilityPercent:
        Math.max(0, Math.min(100, Number(input.probabilityPercent || 0))),
      terminal:
        Boolean(input.terminal),
      terminalOutcome:
        input.terminalOutcome || null,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.pipelineStageModel =
    Object.freeze({ create });
})(window);
