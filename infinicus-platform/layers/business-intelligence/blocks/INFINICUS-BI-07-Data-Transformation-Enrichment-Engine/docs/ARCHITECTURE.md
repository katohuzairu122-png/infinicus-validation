# Architecture

## Processing Sequence

1. Load BI-06 resolved records and merge plans.
2. Apply approved merge plans.
3. Load active transformation rules.
4. Apply rules in sequence.
5. Calculate derived fields.
6. Enrich records with lookup data and date parts.
7. Record before-and-after lineage.
8. Separate transformed and failed records.
9. Persist transformation-run evidence.
10. Prepare analysis-ready records for BI-08.

## Responsibility Boundary

BI-07 creates analysis-ready records.

BI-08 stores and organizes them for analytical access.
