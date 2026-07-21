# ADI-23 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-23"]`

## Factory

`createDecisionGateEngine(options)` — returns the ADI-23 engine/service object (`blockId: "ADI-23"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.decision_gate`

## Routes

| `adi.gate.submit` |
| `adi.gate.review` |
| `adi.gate.get` |
