# INFINICUS DT-04 — Intelligence Package Intake and Validation Engine

Version: 1.0.0

DT-04 receives BI-24 Digital Twin handoff packages, validates identity, schema, freshness, confidence, lineage, and ontology compatibility, then prepares accepted intelligence for twin-state construction.

## Capabilities

- BI-24 handoff intake
- Twin identity validation
- Business identity validation
- Ontology and schema compatibility checks
- Required-section validation
- Freshness validation
- Confidence-policy validation
- Lineage validation
- State-source classification
- Intake quarantine and rejection evidence
- Accepted-package registry
- DT-05 entity-graph handoff
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- DT-01 through DT-03
- BI-24 Digital Twin handoff contract

## Public API

`window.INFINICUS.DT.intelligenceIntakeEngine`
