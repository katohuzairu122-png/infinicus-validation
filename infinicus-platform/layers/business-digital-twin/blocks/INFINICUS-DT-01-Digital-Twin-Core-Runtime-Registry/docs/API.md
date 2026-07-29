# API

`window.INFINICUS.DT.runtime`

## Core Methods

- `success(data, metadata)`
- `failure(code, message, details, metadata)`
- `createId(prefix)`
- `clone(value)`
- `callRoute(routeId, payload)`
- `diagnostics()`

## Registration

- `registerService(id, value, metadata)`
- `registerRoute(id, value, metadata)`
- `registerEntity(id, value, metadata)`
- `registerState(id, value, metadata)`
- `registerSchema(id, value, metadata)`
- `registerEvent(id, value, metadata)`
- `registerAdapter(id, value, metadata)`
- `registerTwin(id, value, metadata)`

## Events

- `on(eventName, handler)`
- `emit(eventName, payload, metadata)`
