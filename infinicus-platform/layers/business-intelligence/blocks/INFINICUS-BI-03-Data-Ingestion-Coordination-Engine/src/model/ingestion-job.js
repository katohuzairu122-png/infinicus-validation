(function (global) {
  "use strict";

  const MODES = Object.freeze([
    "batch",
    "incremental",
    "stream"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const mode = String(input.mode || "batch");

    if (!input.name || !input.datasetContractId || !MODES.includes(mode)) {
      return runtime.failure(
        "INGESTION_JOB_INVALID",
        "name, datasetContractId, and a supported mode are required."
      );
    }

    return runtime.success({
      ingestionJobId:
        input.ingestionJobId ||
        runtime.createId("bi_ingestion_job"),
      name: String(input.name),
      datasetContractId:
        String(input.datasetContractId),
      mode,
      schedule: input.schedule || null,
      sourceCursorField:
        input.sourceCursorField || null,
      sourceWatermarkField:
        input.sourceWatermarkField || null,
      batchSize:
        Math.max(1, Number(input.batchSize || 500)),
      maximumRetries:
        Math.max(0, Number(input.maximumRetries || 3)),
      status: String(input.status || "active"),
      metadata: runtime.clone(input.metadata || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.ingestionJobModel =
    Object.freeze({
      MODES,
      create
    });
})(window);
