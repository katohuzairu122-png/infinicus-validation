# Architecture

## Processing Sequence

1. Register an ingestion job against a published BI-02 dataset contract.
2. Reserve an idempotency key.
3. Create an ingestion run.
4. Load source records.
5. Apply approved BI-02 mappings.
6. Separate mapped and rejected records.
7. Record cursor and watermark checkpoints.
8. Persist ingestion-run evidence.
9. Prepare mapped records for BI-04 quality evaluation.
10. Publish the ingestion-completed event.

## Responsibility Boundary

BI-03 coordinates ingestion and mapping.

BI-04 decides whether mapped records meet data-quality requirements.
