# ADI-01 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-01"]`

## Factory

`createADIRuntime(options)` — returns the ADI-01 engine/service object (`blockId: "ADI-01"`, `version: "1.0.0"`).

## installGlobal

`installGlobal(target)` — idempotently creates `target.INFINICUS.ADI.runtime`.

## Service id

`adi.core_runtime`

## Routes

| `adi.runtime.diagnose` |
| `adi.runtime.manifest` |
