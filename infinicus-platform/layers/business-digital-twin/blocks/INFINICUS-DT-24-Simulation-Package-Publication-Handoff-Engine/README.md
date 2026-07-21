# INFINICUS DT-24 — Simulation Package Publication and Handoff Engine

Version: 1.0.0

DT-24 validates, signs, versions, publishes, and hands off complete Business Digital Twin simulation packages to the Simulation Engine layer.

## Capabilities

- Simulation package policy registry
- Package contract validation
- Actual, assumed, and simulated state separation
- Snapshot and scenario checksum verification
- Package versioning
- Package manifest generation
- Reproducibility metadata
- Lineage and evidence preservation
- Package readiness and rejection records
- Publication registry
- Simulation Engine handoff contract
- IndexedDB persistence
- Demo interface and automated tests

## Dependencies

- DT-01 through DT-23

## Public API

`window.INFINICUS.DT.simulationPackagePublicationEngine`
