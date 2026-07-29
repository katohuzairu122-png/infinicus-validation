# INFINICUS BI-09 — Business Metric and KPI Registry Engine

Version: 1.0.0

BI-09 defines governed business metrics and KPIs that can be calculated consistently across dashboards, reports, alerts, simulations, and the Business Digital Twin.

## Capabilities

- Metric and KPI registry
- Base, derived, ratio, rate, and target metrics
- Numerator and denominator definitions
- Aggregation method definitions
- Dimensional filters
- Time-grain definitions
- Unit and currency metadata
- KPI thresholds and targets
- Metric ownership and governance
- Metric lineage
- Metric versioning
- BI-10 calculation handoff
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- BI-01 through BI-08

## Public API

`window.INFINICUS.BI.metricRegistryEngine`
