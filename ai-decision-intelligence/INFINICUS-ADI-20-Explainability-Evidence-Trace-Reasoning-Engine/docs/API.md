# ADI-20 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-20"]`

## Factory

`createExplainabilityEngine(options)` — returns the ADI-20 engine/service object (`blockId: "ADI-20"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.explainability`

## Routes

| `adi.explanation.create` |
| `adi.explanation.get` |
