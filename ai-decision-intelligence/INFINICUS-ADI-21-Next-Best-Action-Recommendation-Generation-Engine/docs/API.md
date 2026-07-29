# ADI-21 API

## Block namespace

`window.INFINICUS.ADI.blocks["ADI-21"]`

## Factory

`createRecommendationEngine(options)` — returns the ADI-21 engine/service object (`blockId: "ADI-21"`, `version: "1.0.0"`).

## attachToADIRuntime

`attachToADIRuntime(runtime, options)` — validates dependencies, registers the service and routes, returns a result envelope.

## Service id

`adi.recommendation_generation`

## Routes

| `adi.recommendation.propose` |
| `adi.recommendation.get` |
