(function (global) {
  "use strict";

  function create({
    ingestionJob,
    correlationId,
    idempotencyKey,
    cursor = null,
    watermark = null
  }) {
    const runtime = global.INFINICUS.BI.runtime;

    return {
      ingestionRunId:
        runtime.createId("bi_ingestion_run"),
      ingestionJobId:
        ingestionJob.ingestionJobId,
      datasetContractId:
        ingestionJob.datasetContractId,
      correlationId:
        correlationId || runtime.createId("correlation"),
      idempotencyKey:
        String(idempotencyKey || ""),
      mode: ingestionJob.mode,
      status: "running",
      cursor,
      watermark,
      attempt: 1,
      counts: {
        received: 0,
        mapped: 0,
        rejected: 0,
        pendingQuality: 0
      },
      errors: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString()
    };
  }

  global.INFINICUS.BI.ingestionRunModel =
    Object.freeze({ create });
})(window);
