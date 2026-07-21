# ADI-25 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-25"]`

## Factory

`createMasterIntegrationEngine(options)` — returns the ADI-25 engine/service object (`blockId: "ADI-25"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.master_integration`

## Routes

| `adi.master.diagnose` |
| `adi.master.assert-ready` |
| `adi.master.deployment-plan` |
