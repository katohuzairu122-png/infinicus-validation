# Architecture

## Processing Sequence

1. Register cleaning rules against a BI-02 dataset contract.
2. Load BI-04 accepted and warning records.
3. Apply automatic rules in sequence.
4. Preserve original and cleaned values.
5. Record every field-level change.
6. Separate successful and failed cleaning results.
7. Convert quarantined records into manual-remediation items.
8. Persist cleaning-run evidence.
9. Prepare cleaned records for BI-06 entity resolution.
10. Publish cleaning completion event.

## Responsibility Boundary

BI-05 standardizes records.

BI-06 determines whether different records represent the same business entity.
