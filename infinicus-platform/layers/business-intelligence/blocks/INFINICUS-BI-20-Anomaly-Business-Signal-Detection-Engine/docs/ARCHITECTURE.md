# Architecture

## Processing Sequence

1. Register detection rules.
2. Load BI-19 anomaly handoff.
3. Evaluate statistical deviations.
4. Evaluate sudden trend changes.
5. Escalate severe variances.
6. Detect benchmark breaches.
7. Detect configured cross-domain contradictions.
8. Score severity and confidence.
9. Deduplicate and prioritize signals.
10. Publish investigation context to BI-21.

## Responsibility Boundary

BI-20 detects abnormal business conditions.

BI-21 investigates likely drivers and root causes.
