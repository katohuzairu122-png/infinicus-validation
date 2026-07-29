# ADI-13 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-13"]`

## Factory

`createAlternativeGenerationEngine(options)` — returns the ADI-13 engine/service object (`blockId: "ADI-13"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.alternative_generation`

## Routes

| `adi.alternatives.generate` |
| `adi.alternatives.get` |
| `adi.alternatives.list` |
