# Architecture

## Processing Sequence

1. Load DT-03 intake handoff.
2. Receive BI-24 Digital Twin handoff package.
3. Verify business and twin identity.
4. Verify ontology and schema version.
5. Verify freshness and confidence.
6. Verify required package sections and lineage.
7. Classify each state source.
8. Map intelligence states to ontology entity types.
9. Accept or quarantine the package.
10. Prepare DT-05 entity-graph handoff.

## Responsibility Boundary

DT-04 validates and accepts intelligence.

DT-05 constructs entity instances and relationship graphs.
