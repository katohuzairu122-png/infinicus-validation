# ADI-16 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-16"]`

## Factory

`createSimulationOrchestrator(options)` — returns the ADI-16 engine/service object (`blockId: "ADI-16"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.simulation_orchestration`

## Routes

| `adi.scenarios.orchestrate` |
| `adi.scenarios.get` |
