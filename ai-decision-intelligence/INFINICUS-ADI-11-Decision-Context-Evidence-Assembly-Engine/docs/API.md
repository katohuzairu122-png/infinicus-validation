# ADI-11 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-11"]`

## Factory

`createAssemblyEngine(options)` — returns the ADI-11 engine/service object (`blockId: "ADI-11"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.context_evidence_assembly`

## Routes

| `adi.analysis_case.assemble` |
| `adi.analysis_case.get` |
| `adi.analysis_case.list` |
| `adi.analysis_case.history` |
| `adi.analysis_case.verify` |
