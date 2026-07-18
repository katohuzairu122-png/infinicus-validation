# INFINICUS BI-02 — Data Source Mapping and Semantic Definition Engine

Version: 1.0.0

BI-02 maps data from the Data Acquisition and Business Operations layers into a canonical Business Intelligence semantic model.

## Capabilities

- Source-system registry
- Source field definitions
- Canonical business entities
- Fact and dimension definitions
- Field mapping rules
- Data-type compatibility checks
- Semantic validation
- Lineage metadata
- Mapping-version control
- Dataset contract publication
- Handoff preparation for BI-03
- Demo interface and automated tests

## Public API

`window.INFINICUS.BI.dataSourceMappingEngine`

## Layer Boundary

BI-02 does not ingest or transform records. It defines how incoming source data must be interpreted before BI-03 begins ingestion.
