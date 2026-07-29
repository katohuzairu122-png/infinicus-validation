# OM-01 Instructions

## Purpose

Provide the shared runtime and registries for OM-02 through OM-25.

## Rules

- Do not implement domain-specific monitoring logic inside OM-01.
- Keep observed, calculated, inferred, assumed, and simulated values distinct.
- Preserve business, action, monitoring contract, metric, observation, outcome, correlation, causation, confidence, and lineage identifiers.
- Do not treat correlation as causation.
- Do not accept monitoring data without source and timestamp metadata.
- Do not overwrite source evidence.
- Register all later OM services and routes through the OM-01 runtime.
- Fail closed when required runtime components are unavailable.
