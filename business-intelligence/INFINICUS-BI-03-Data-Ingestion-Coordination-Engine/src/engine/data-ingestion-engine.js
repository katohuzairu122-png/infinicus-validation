(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerJob(input = {}) {
    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            input.datasetContractId
        });

    if (!contract.ok) return contract;

    if (contract.data.status !== "published") {
      return runtime.failure(
        "CONTRACT_NOT_PUBLISHED",
        "Only published dataset contracts may be used."
      );
    }

    const built =
      global.INFINICUS.BI
        .ingestionJobModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .ingestionStore
        .put("jobs", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.ingestion_job.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    ingestionJobId,
    records = [],
    idempotencyKey,
    correlationId = null,
    cursor = null,
    watermark = null
  } = {}) {
    const job =
      await global.INFINICUS.BI
        .ingestionStore
        .get("jobs", ingestionJobId);

    if (!job.ok) return job;

    if (job.data.status !== "active") {
      return runtime.failure(
        "INGESTION_JOB_INACTIVE",
        "The ingestion job is not active."
      );
    }

    const idempotency =
      global.INFINICUS.BI
        .ingestionIdempotencyRegistry
        .reserve(idempotencyKey, {
          ingestionJobId
        });

    if (!idempotency.reserved) {
      return runtime.failure(
        "DUPLICATE_INGESTION",
        idempotency.reason,
        idempotency
      );
    }

    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            job.data.datasetContractId
        });

    if (!contract.ok) return contract;

    const run =
      global.INFINICUS.BI
        .ingestionRunModel
        .create({
          ingestionJob: job.data,
          correlationId,
          idempotencyKey,
          cursor,
          watermark
        });

    run.counts.received =
      Array.isArray(records) ? records.length : 0;

    const mappedRecords = [];
    const rejectedRecords = [];

    for (let index = 0; index < records.length; index += 1) {
      const mapped =
        global.INFINICUS.BI
          .ingestionRecordMapper
          .mapRecord(
            records[index],
            contract.data.mappings
          );

      if (mapped.valid) {
        mappedRecords.push({
          sourceIndex: index,
          record: mapped.record
        });
      } else {
        rejectedRecords.push({
          sourceIndex: index,
          sourceRecord:
            runtime.clone(records[index]),
          errors: mapped.errors
        });
      }
    }

    run.counts.mapped = mappedRecords.length;
    run.counts.rejected = rejectedRecords.length;
    run.counts.pendingQuality = mappedRecords.length;
    run.status =
      rejectedRecords.length === records.length &&
      records.length > 0
        ? "failed"
        : "completed";
    run.errors =
      rejectedRecords.flatMap(item => item.errors);
    run.completedAt = new Date().toISOString();
    run.updatedAt = run.completedAt;

    await global.INFINICUS.BI
      .ingestionStore
      .put("runs", run);

    const handoff = {
      qualityHandoffId:
        runtime.createId("bi_quality_handoff"),
      targetBlock: "BI-04",
      ingestionRunId:
        run.ingestionRunId,
      ingestionJobId,
      datasetContractId:
        run.datasetContractId,
      correlationId:
        run.correlationId,
      records:
        mappedRecords.map(runtime.clone),
      rejectedRecords:
        rejectedRecords.map(runtime.clone),
      cursor,
      watermark,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .ingestionStore
      .put("quality_handoffs", handoff);

    await runtime.emit(
      "bi.ingestion.completed",
      {
        run,
        qualityHandoffId:
          handoff.qualityHandoffId
      }
    );

    return runtime.success({
      run,
      handoff
    });
  }

  async function retry({
    ingestionRunId,
    records = []
  } = {}) {
    const previous =
      await global.INFINICUS.BI
        .ingestionStore
        .get("runs", ingestionRunId);

    if (!previous.ok) return previous;

    const job =
      await global.INFINICUS.BI
        .ingestionStore
        .get(
          "jobs",
          previous.data.ingestionJobId
        );

    if (!job.ok) return job;

    if (
      previous.data.attempt >=
      job.data.maximumRetries + 1
    ) {
      return runtime.failure(
        "RETRY_LIMIT_REACHED",
        "Maximum ingestion retries reached."
      );
    }

    const nextKey =
      `${previous.data.idempotencyKey}:retry:${previous.data.attempt + 1}`;

    const result = await execute({
      ingestionJobId:
        previous.data.ingestionJobId,
      records,
      idempotencyKey: nextKey,
      correlationId:
        previous.data.correlationId,
      cursor: previous.data.cursor,
      watermark:
        previous.data.watermark
    });

    if (result.ok) {
      result.data.run.attempt =
        previous.data.attempt + 1;

      await global.INFINICUS.BI
        .ingestionStore
        .put("runs", result.data.run);
    }

    return result;
  }

  const api = Object.freeze({
    registerJob,
    execute,
    retry,
    getJob: ({ ingestionJobId }) =>
      global.INFINICUS.BI
        .ingestionStore
        .get("jobs", ingestionJobId),
    getRun: ({ ingestionRunId }) =>
      global.INFINICUS.BI
        .ingestionStore
        .get("runs", ingestionRunId),
    getQualityHandoff: ({ qualityHandoffId }) =>
      global.INFINICUS.BI
        .ingestionStore
        .get(
          "quality_handoffs",
          qualityHandoffId
        ),
    listRuns: () =>
      global.INFINICUS.BI
        .ingestionStore
        .list("runs")
  });

  runtime.registerService(
    "bi.data_ingestion",
    api,
    { block: "BI-03" }
  );

  runtime.registerRoute(
    "bi.ingestion_job.register",
    registerJob
  );

  runtime.registerRoute(
    "bi.ingestion.execute",
    execute
  );

  runtime.registerRoute(
    "bi.ingestion.retry",
    retry
  );

  global.INFINICUS.BI.dataIngestionEngine = api;
})(window);
