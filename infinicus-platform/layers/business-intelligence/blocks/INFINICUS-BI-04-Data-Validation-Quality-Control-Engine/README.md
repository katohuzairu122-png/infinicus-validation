# INFINICUS BI-04 — Data Validation and Quality Control Engine

Version: 1.0.0

BI-04 evaluates ingested Business Intelligence records for completeness, validity, uniqueness, consistency, timeliness, and conformity.

## Capabilities

- Data-quality rule registry
- Completeness validation
- Data-type and format validation
- Range validation
- Referential checks
- Uniqueness checks
- Timeliness checks
- Dataset-level quality scoring
- Quarantine management
- Rule failure evidence
- Quality issue registry
- BI-05 cleaning handoff
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- BI-01 — Business Intelligence Core Runtime and Registry
- BI-02 — Data Source Mapping and Semantic Definition Engine
- BI-03 — Data Ingestion Coordination Engine

## Public API

`window.INFINICUS.BI.dataQualityEngine`
