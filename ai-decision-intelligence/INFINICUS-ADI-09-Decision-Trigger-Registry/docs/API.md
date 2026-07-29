# ADI-09 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-09"]`

## Factory

`createTriggerRegistry(options)` — returns the ADI-09 engine/service object (`blockId: "ADI-09"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.trigger_registry`

## Routes

| `adi.trigger.create` |
| `adi.trigger.get` |
| `adi.trigger.list` |
| `adi.trigger.history` |
| `adi.trigger.update` |
| `adi.trigger.status.update` |
| `adi.trigger.legacy.import` |
| `adi.trigger.legacy.export` |
