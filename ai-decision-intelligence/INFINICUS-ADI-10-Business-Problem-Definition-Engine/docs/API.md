# ADI-10 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-10"]`

## Factory

`createProblemDefinitionEngine(options)` — returns the ADI-10 engine/service object (`blockId: "ADI-10"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.problem_definition`

## Routes

| `adi.problem.create` |
| `adi.problem.get` |
| `adi.problem.list` |
| `adi.problem.history` |
| `adi.problem.update` |
| `adi.problem.status.update` |
| `adi.problem.legacy.import` |
| `adi.problem.legacy.export` |
