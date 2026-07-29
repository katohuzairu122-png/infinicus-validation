# ADI-07 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-07"]`

## Factory

`createEvidenceRegistry(options)` — returns the ADI-07 engine/service object (`blockId: "ADI-07"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.evidence_registry`

## Routes

| `adi.evidence.register` |
| `adi.evidence.context.ingest` |
| `adi.evidence.get` |
| `adi.evidence.list` |
| `adi.evidence.verify` |
| `adi.evidence.supersede` |
| `adi.evidence.revoke` |
