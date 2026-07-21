# ABA-25 Implementation Instructions

## Purpose

Assemble and validate ABA-01 through ABA-24 without rewriting their internal business logic.

## Rules

- Load every block in strict dependency order.
- Do not bypass upstream validation.
- Do not mutate recommendation, decision, approval, action, execution, or outcome lineage.
- Preserve business, twin, simulation, scenario, recommendation, decision, approval, action, contract, plan, task, execution, outcome, correlation, causation, confidence, and lineage identifiers.
- Keep observed, calculated, inferred, assumed, and simulated states distinct.
- Do not store secrets in browser-visible configuration.
- Fail closed when required blocks, routes, services, or configuration are missing.
- Record diagnostic and deployment-readiness evidence.
- Do not mark the subsystem production-ready unless all mandatory checks pass.
