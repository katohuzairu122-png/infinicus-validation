# Architecture

BI-02 creates the semantic boundary between operational source systems and the Business Intelligence layer.

## Processing Sequence

1. Register a source system.
2. Define canonical entities, facts, and dimensions.
3. Define canonical fields and data types.
4. Map source fields to canonical fields.
5. Validate data-type compatibility.
6. Record field-level lineage.
7. Publish a versioned dataset contract.
8. Prepare the contract for BI-03 ingestion.

## Key Principle

BI-02 defines meaning. BI-03 will execute ingestion.
