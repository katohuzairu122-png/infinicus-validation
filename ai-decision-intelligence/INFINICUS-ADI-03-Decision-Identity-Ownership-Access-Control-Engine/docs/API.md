# ADI-03 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-03"]`

## Factory

`createAccessControlEngine(options)` — returns the ADI-03 engine/service object (`blockId: "ADI-03"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.access_control`

## Routes

| `adi.access.authorize` |
| `adi.decision_case.secure` |
