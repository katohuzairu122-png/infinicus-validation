# Architecture

## Processing Sequence

1. Receive completed BI-11 through BI-18 analysis handoffs.
2. Consolidate domain health, profiles, and signals.
3. Analyze time-series direction and momentum.
4. Compare actual values with targets, plans, and baselines.
5. Compare actual values with sourced external benchmarks.
6. Classify favorable and unfavorable variance.
7. Rank domain performance.
8. Persist comparison evidence.
9. Prepare anomaly-detection context.
10. Publish handoff to BI-20.

## Responsibility Boundary

BI-19 performs comparative analysis.

BI-20 detects unusual patterns and abnormal business signals.
