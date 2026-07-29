# INFINICUS OM-02 — Monitoring Contract Intake and Validation Engine

Version: 1.0.0

OM-02 receives monitoring contracts published by ABA-24, validates their structure, lineage, metrics, targets, evidence sources, observation windows, attribution requirements, causation requirements, and confidence rules, then registers accepted contracts for OM-03.

Public API:

`window.INFINICUS.OM.monitoringContractIntakeEngine`

## Capabilities

- Monitoring-contract intake
- Contract schema validation
- Identity and lineage validation
- Outcome and metric validation
- Baseline and target validation
- Tolerance and threshold validation
- Observation-window validation
- Evidence-source validation
- Attribution and causation validation
- Confidence validation
- Idempotent intake
- Quarantine for invalid contracts
- OM-03 handoff
- IndexedDB persistence
