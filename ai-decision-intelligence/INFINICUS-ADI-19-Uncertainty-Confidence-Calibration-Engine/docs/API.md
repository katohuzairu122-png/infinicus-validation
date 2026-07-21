# ADI-19 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-19"]`

## Factory

`createConfidenceCalibrationEngine(options)` — returns the ADI-19 engine/service object (`blockId: "ADI-19"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.confidence_calibration`

## Routes

| `adi.confidence.assess` |
| `adi.confidence.get` |
