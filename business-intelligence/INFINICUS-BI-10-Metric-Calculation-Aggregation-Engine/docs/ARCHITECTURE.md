# Architecture

## Processing Sequence

1. Load BI-09 calculation handoff.
2. Validate metric dependency order.
3. Query BI-08 warehouse datasets.
4. Apply metric filters.
5. Group by dimensions and time grain.
6. Calculate base metrics.
7. Calculate derived, ratio, rate, and target metrics.
8. Evaluate targets and thresholds.
9. Persist versioned metric results.
10. Publish intelligence handoff to BI-11 through BI-18.

## Responsibility Boundary

BI-10 calculates metrics.

BI-11 through BI-18 interpret metrics by business domain.
