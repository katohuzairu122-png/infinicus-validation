# Architecture

## Processing Sequence

1. Reference a governed BI-08 warehouse dataset.
2. Define metric name and stable code.
3. Select metric type.
4. Define aggregation or formula.
5. Declare dependencies.
6. Declare dimensions, filters, and time grain.
7. Declare unit, currency, target, and thresholds.
8. Validate dependency graph.
9. Record lineage and version.
10. Publish approved metrics to BI-10.

## Responsibility Boundary

BI-09 defines metrics.

BI-10 calculates and aggregates metric values.
