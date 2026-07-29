# API

`window.INFINICUS.BI.runtime`

## Runtime

- `success(data, meta)`
- `failure(code, message, details, meta)`
- `createId(prefix)`
- `clone(value)`

## Services and Routes

- `registerService(key, value, metadata)`
- `getService(key)`
- `listServices()`
- `registerRoute(key, handler, metadata)`
- `getRoute(key)`
- `listRoutes()`
- `call(routeName, payload, meta)`

## Registries

- `registerDataset(key, value, metadata)`
- `getDataset(key)`
- `listDatasets()`
- `registerMetric(key, value, metadata)`
- `getMetric(key)`
- `listMetrics()`
- `registerConnector(key, value, metadata)`
- `getConnector(key)`
- `listConnectors()`

## Events and Diagnostics

- `on(eventName, handler)`
- `emit(eventName, detail, meta)`
- `diagnostics()`
