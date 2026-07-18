# Architecture

## Input boundary

ABA-24 publishes an Outcome Monitoring contract.

## OM-01 role

OM-01 provides:

- runtime
- service registry
- route registry
- event bus
- lifecycle registry
- metric registry
- source registry
- monitoring-contract registry
- outcome-state registry
- diagnostics
- OM manifest

## Downstream

OM-02 validates the ABA-24 monitoring contract.

OM-24 publishes a learning package to Continuous Learning.

OM-25 assembles the complete Outcome Monitoring subsystem.
