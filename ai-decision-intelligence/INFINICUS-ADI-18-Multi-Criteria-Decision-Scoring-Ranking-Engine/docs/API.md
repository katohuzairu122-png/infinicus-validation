# ADI-18 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-18"]`

## Factory

`createScoringEngine(options)` — returns the ADI-18 engine/service object (`blockId: "ADI-18"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.scoring_ranking`

## Routes

| `adi.ranking.score` |
| `adi.ranking.get` |
