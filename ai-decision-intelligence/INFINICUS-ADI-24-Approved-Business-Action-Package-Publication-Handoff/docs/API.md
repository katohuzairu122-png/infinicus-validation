# ADI-24 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-24"]`

## Factory

`createABAHandoffEngine(options)` — returns the ADI-24 engine/service object (`blockId: "ADI-24"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.aba_handoff`

## Routes

| `adi.handoff.build` |
| `adi.handoff.publish` |
| `adi.handoff.get` |
