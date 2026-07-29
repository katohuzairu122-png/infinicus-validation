# INFINICUS BI-21 — Root-Cause and Driver Analysis Engine

Version: 1.0.0

BI-21 investigates prioritized anomalies and business signals to identify likely contributing drivers, causal hypotheses, supporting evidence, and confidence levels.

## Capabilities

- Investigation-case registry
- Driver-candidate registry
- Correlation and contribution analysis
- Five-whys investigation structure
- Cause-and-effect graph construction
- Evidence weighting
- Contradiction and confounder tracking
- Root-cause confidence scoring
- Primary and secondary driver ranking
- Unresolved-hypothesis queue
- BI-22 reporting handoff
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- BI-01 through BI-20

## Public API

`window.INFINICUS.BI.rootCauseDriverAnalysisEngine`
