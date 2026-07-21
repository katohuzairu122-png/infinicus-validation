# API

`window.INFINICUS.BI.dataIngestionEngine`

- `registerJob(input)`
- `execute({ ingestionJobId, records, idempotencyKey, correlationId, cursor, watermark })`
- `retry({ ingestionRunId, records })`
- `getJob({ ingestionJobId })`
- `getRun({ ingestionRunId })`
- `getQualityHandoff({ qualityHandoffId })`
- `listRuns()`

## Routes

- `bi.ingestion_job.register`
- `bi.ingestion.execute`
- `bi.ingestion.retry`
