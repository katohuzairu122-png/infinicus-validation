# INFINICUS BI-03 — Data Ingestion Coordination Engine

Version: 1.0.0

BI-03 coordinates the controlled movement of data from approved source systems into the Business Intelligence layer.

## Capabilities

- Ingestion job registry
- Batch and incremental ingestion modes
- Dataset contract enforcement
- Cursor and watermark tracking
- Idempotency controls
- Retry and failure handling
- Source checkpointing
- Ingestion run history
- Row-level mapping preparation
- BI-04 quality-control handoff
- Event publication
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- BI-01 — Business Intelligence Core Runtime and Registry
- BI-02 — Data Source Mapping and Semantic Definition Engine

## Public API

`window.INFINICUS.BI.dataIngestionEngine`
