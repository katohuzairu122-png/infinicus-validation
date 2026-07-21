# Core Outcome Monitoring Domain Model

## Monitoring contract

Defines what must be observed, when, how, from which source, and against which baseline and target.

## Metric

Defines a measurable business variable, unit, aggregation, direction, formula, and source field.

## Observation source

Defines the system or evidence source that provides actual observations.

## Outcome state

Stores the governed state of an expected outcome during monitoring.

## State classifications

- observed
- calculated
- inferred
- assumed
- simulated

Only observed values may be treated as direct evidence of actual business state.
