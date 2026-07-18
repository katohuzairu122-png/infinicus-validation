# INFINICUS BI-10 — Metric Calculation and Aggregation Engine

Version: 1.0.0

BI-10 calculates governed metrics from BI-08 warehouse datasets using BI-09 definitions.

## Capabilities

- Base metric calculation
- Derived metric evaluation
- Ratio and rate calculation
- Dimensional grouping
- Time-grain aggregation
- Dataset filtering
- Sum, count, distinct count, average, minimum, maximum, median, first, and last
- Target and threshold evaluation
- Metric result versioning
- Calculation-run history
- Dependency ordering
- BI-11 through BI-18 intelligence-domain handoff
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- BI-01 through BI-09

## Public API

`window.INFINICUS.BI.metricCalculationEngine`
