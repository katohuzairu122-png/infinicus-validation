# ADI-06 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-06"]`

## Factory

`createSimulationResultsAdapter(options)` — returns the ADI-06 engine/service object (`blockId: "ADI-06"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.simulation_results_adapter`

## Routes

| `adi.simulation_results.acquire` |
