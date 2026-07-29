# ADI-08 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-08"]`

## Factory

`createGoalRegistry(options)` — returns the ADI-08 engine/service object (`blockId: "ADI-08"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.goal_registry`

## Routes

| `adi.goal.create` |
| `adi.goal.get` |
| `adi.goal.list` |
| `adi.goal.history` |
| `adi.goal.update` |
| `adi.goal.status.update` |
| `adi.goal.legacy.import` |
| `adi.goal.legacy.export` |
