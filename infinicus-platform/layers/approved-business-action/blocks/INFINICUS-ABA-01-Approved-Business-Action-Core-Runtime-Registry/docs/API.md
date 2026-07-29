# API

`window.INFINICUS.ABA.runtime`

- `createId(prefix)`
- `clone(value)`
- `success(data, meta)`
- `failure(code, message, details, meta)`
- `registerService(name, api, metadata)`
- `getService(name)`
- `registerRoute(name, handler, metadata)`
- `dispatch(name, payload, context)`
- `on(eventName, listener)`
- `emit(eventName, payload)`
- `registerLifecycle(name, definition)`
- `validateTransition(name, fromState, toState)`
- `registerBlock(blockId, metadata)`
- `diagnostics()`
