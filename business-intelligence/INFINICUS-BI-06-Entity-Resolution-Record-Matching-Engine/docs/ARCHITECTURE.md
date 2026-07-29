# Architecture

## Processing Sequence

1. Register match rules for a canonical entity type.
2. Load cleaned BI-05 records.
3. Group records using blocking keys.
4. Generate candidate record pairs.
5. Score configured fields.
6. Classify each pair.
7. Create automatic duplicate clusters.
8. Send ambiguous pairs to manual review.
9. Prepare canonical merge plans.
10. Send resolved records and plans to BI-07.

## Match Classifications

- automatic match
- manual review
- no match
