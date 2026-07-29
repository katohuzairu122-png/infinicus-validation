# ADI-12 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-12"]`

## Factory

`createFrameworkEngine(options)` — returns the ADI-12 engine/service object (`blockId: "ADI-12"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.evaluation_framework`

## Routes

| `adi.evaluation_framework.create` |
| `adi.evaluation_framework.from_problem` |
| `adi.evaluation_framework.get` |
| `adi.evaluation_framework.list` |
| `adi.evaluation_framework.history` |
| `adi.evaluation_framework.update` |
| `adi.evaluation_framework.validate` |
| `adi.evaluation_framework.lock` |
| `adi.evaluation_framework.supersede` |
