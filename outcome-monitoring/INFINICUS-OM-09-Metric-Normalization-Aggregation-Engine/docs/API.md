# API

`window.INFINICUS.OM.metricNormalizationAggregationEngine`

- `registerPolicy(input)`
- `registerConverter({ sourceUnit, targetUnit, converter })`
- `normalizeAndAggregate({ normalizationHandoffId, metricNormalizationPolicyId })`
- `getOutcomeProgressHandoff({ outcomeProgressHandoffId })`
- `listNormalizedObservations()`
- `listMetricAggregates()`

Routes:
- `om.metric_normalization_policy.register`
- `om.metrics.normalize_aggregate`
