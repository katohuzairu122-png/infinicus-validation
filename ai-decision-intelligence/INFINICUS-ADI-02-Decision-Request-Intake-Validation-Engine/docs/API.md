# ADI-02 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-02"]`

## Factory

`createDecisionRequestIntakeEngine(options)` — returns the ADI-02 engine/service object (`blockId: "ADI-02"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.decision_request_intake`

## Routes

| `adi.decision_request.submit` |
